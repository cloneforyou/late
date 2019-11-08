const aws = require('aws-sdk')
const s3 = new aws.S3()
const mongoose = require('mongoose')
const logger = require('../../../modules/logger')
const fileType = require('file-type')
const readChunk = require('read-chunk')

const sharp = require('sharp')

const uuidv4 = require('uuid/v4')

const DormPhoto = require('./dormphotos.model')
const DormRating = require('../dormratings/dormratings.model')

/**
 * Helper function that handles image processing and saving to the file system.
 * @param dormId ID of the dorm this file belongs to
 * @param fileName Name of the uploaded file
 * @param path Temporary path to the file
 * @returns {Promise<unknown>}
 */
async function uploadFile (dormId, { name: fileName, path }) {
  // Verify file extension
  const acceptedFileTypes = ['png', 'jpg', 'jpeg', 'tiff', 'gif']
  const splitFileName = fileName.split('.')
  if (splitFileName.length < 2 || !acceptedFileTypes.includes(splitFileName[splitFileName.length - 1])) {
    throw new Error('Unsupported file type')
  }

  // Verify magic number
  const acceptedMimes = ['image/png', 'image/jpeg', 'image/tiff', 'image/gif']
  const magicNumberType = fileType(await readChunk(path, 0, fileType.minimumBytes)).mime
  if (!acceptedMimes.includes(magicNumberType)) {
    throw new Error('Unsupported file type')
  }

  // Resize twice to require images are resized & avoid security hole by rewriting entire image
  const resizedPhoto = await sharp(path)
    .resize(1001)
    .resize(1000)
    .toBuffer()

  return new Promise((resolve, reject) => {
    s3.upload(
      {
        ACL: 'public-read',
        Bucket: 'late-dorm-photos',
        Body: resizedPhoto,
        Key: `dorm-photo-${dormId}-${uuidv4()}`,
        ContentType: magicNumberType
      },
      function (err, data) {
        if (err) {
          reject(err)
        } else if (data) {
          resolve({ key: data.Key, url: data.Location })
        }
      }
    )
  })
}

/**
 * Get all photos for a given dorm
 * @param ctx {Koa context} ctx.params.id is required and is the dorm's ID which to get photos for. If the user
 * is admin, all photos are retrieved. If the user is not admin, only confirmed OR their own photos are retrieved.
 * Photo rating and author data is aggregated.
 * @returns {Promise<void>}
 */
async function getPhotosForDorm (ctx) {
  const searchObj = { _dorm: mongoose.Types.ObjectId(ctx.params.id) }

  // Give the user only approved photos or their own, unless they're admin
  if (ctx.state.user) {
    if (!ctx.state.user.admin) {
      searchObj.$or = [{ confirmed: true }, { _author: ctx.state.user._id }]
    }
  } else {
    searchObj.confirmed = true
  }

  const photos = await DormPhoto.aggregate()
    .match(searchObj)
    .lookup({
      from: 'students',
      let: { authorid: '$_author', isAnonymous: '$_isAnonymous' },
      pipeline: [
        { $match: { $expr: { $eq: ['$$authorid', '$_id'] } } },
        { $project: { name: 1, graduationYear: 1 } },
        { $redact: { $cond: [{ $eq: ['$$isAnonymous', true] }, '$$PRUNE', '$$KEEP'] } }
      ],
      as: '_author'
    })
    .lookup({ // Stream ratings for this review into the 'rating' array
      from: 'dormratings',
      localField: '_id',
      foreignField: '_isFor',
      as: 'rating'
    })
    .addFields({ // Reduce the array of ratings into a simple integer value
      rating: { $reduce: {
        input: '$rating',
        initialValue: 0,
        in: { $add: ['$$value', '$$this.value'] }
      } }
    })

  ctx.ok({ photos })
}

/**
 * Upload a photo for a given dorm.
 * @param ctx {Koa context} ctx.state.user is assumed to be defined. ctx.request.files.photo is required
 * and must also be a valid image. The image is resized in order to sanitize. ctx.request.body.isAnonymous and
 * ctx.request.body.description are also used. ctx.params.id is the dorm's ID to post this for and is required.
 * @returns {Promise<*>}
 */
async function postPhoto (ctx) {
  if (!ctx.request.files || !ctx.request.files.photo) {
    return ctx.badRequest('You did not upload a photo!')
  }

  const { url } = await uploadFile(ctx.params.id, ctx.request.files.photo)

  const newDormPhoto = new DormPhoto({
    _author: ctx.state.user._id,
    _dorm: ctx.params.id,
    imageURL: url,
    isAnonymous: !!ctx.request.body.isAnonymous,
    description: ctx.request.body.description,
    confirmed: false
  })

  try {
    await newDormPhoto.save()
  } catch (e) {
    logger.error(`Failed to upload dorm photo: ${e}`)
    return ctx.badRequest('There was an issue saving the photo!')
  }
  logger.info(`${ctx.state.user.identifier} posted a dorm photo for dorm ${ctx.params.id}`)
  ctx.created({ photo: newDormPhoto })
}

/**
 * Edit a given photo's description or anonymous/confirmed status. Admins are able to edit any photo but
 * users can only edit their own. Only admins can edit the confirmed status of a photo.
 * @param ctx {Koa context} Requires a URL id parameter which is the ID of the photo. If the body parameters
 * isAnonymous, description, and/or confirmed are defined, then the photo
 * @returns {Promise<*>}
 */
async function editPhoto (ctx) {
  const searchObj = { _id: mongoose.Types.ObjectId(ctx.params.id) }
  if (!ctx.state.user || !ctx.state.user.admin) {
    searchObj._author = ctx.state.user._id
  }
  const photo = await DormPhoto.findOne(searchObj)

  if (photo == null) {
    return ctx.notFound()
  }
  logger.info(`${ctx.state.user.identifier} edited a dorm photo`)

  photo.isAnonymous = ctx.request.body.isAnonymous === undefined ? photo.isAnonymous : !!ctx.request.body.isAnonymous
  photo.description = ctx.request.body.description === undefined ? photo.description : ctx.request.body.description
  if (ctx.state.user.admin) { // Only admins can edit confirmed status
    photo.confirmed = ctx.request.body.confirmed === undefined ? photo.confirmed : !!ctx.request.body.confirmed
  }
  photo.save()
  ctx.noContent()
}

/**
 * Delete a photo from the database and from the dorm photos file system. Admins can delete any photo, users can
 * only delete their own.
 * @param ctx {Koa context} Requires an id URL parameter, which is the photo's ID. Assumes ctx.state.user is defined.
 * @returns {Promise<*>}
 */
async function deletePhoto (ctx) {
  const searchObj = { _id: ctx.params.id }
  if (!ctx.state.user.admin) { // Users can only delete their own questions unless they're admin
    searchObj._author = ctx.state.user._id
  }

  const photo = await DormPhoto.findOne(searchObj)
  if (photo == null) {
    return ctx.notFound()
  }

  const parts = photo.imageURL.split('/')
  await s3.deleteObject({
    Bucket: 'late-dorm-photos',
    Key: parts[parts.length - 1]
  }).promise()

  await photo.remove()

  logger.info(`${ctx.state.user.identifier} deleted a dorm photo`)
  ctx.noContent()
}

/**
 * Submit a positive, neutral, or negative vote on a submitted photo.
 * @param ctx {Koa context}. Requires an id URL parameter, which is the ID of the photo to vote on.
 * Assumes that ctx.state.user is defined. If ctx.request.body.value is "POSITIVE", then the vote is positive.
 * If it is absent, then the vote is neutral (remove vote). If it is anything else then the vote is negative.
 * @returns {Promise<*>}
 */
async function voteOnPhoto (ctx) {
  const dp = await DormPhoto.findOne({ _id: ctx.params.id })
  if (dp == null) {
    return ctx.notFound()
  }
  let rating

  rating = await DormRating.findOne({
    _isFor: ctx.params.id,
    isForType: 'DormPhoto',
    _from: ctx.state.user._id
  })

  if (rating == null) {
    rating = new DormRating()
  }

  rating._from = ctx.state.user._id
  rating._isFor = dp
  rating.isForType = 'DormPhoto'
  rating.value = ctx.request.body.value === 'POSITIVE' ? 1 : ctx.request.body.value === undefined ? 0 : -1
  rating.save()
  ctx.noContent()
}

module.exports = {
  getPhotosForDorm,
  postPhoto,
  editPhoto,
  deletePhoto,
  voteOnPhoto
}
