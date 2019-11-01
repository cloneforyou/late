const logger = require('../../../modules/logger')
const DormReview = require('./dormreviews.model')
const DormRating = require('../dormratings/dormratings.model')
const Dorm = require('../dorms.model')
const mongoose = require('mongoose')

async function getReviews (ctx) {
  // Must cast ID to ObjectId: https://github.com/Automattic/mongoose/issues/1399
  const queryObj = { _dorm: mongoose.Types.ObjectId(ctx.params.id), hasBeenEdited: false }
  if (ctx.query.search) {
    queryObj.$or = [
      { body: new RegExp('.*' + ctx.query.search + '.*', 'i') },
      { title: new RegExp('.*' + ctx.query.search + '.*', 'i') }
    ]
  }

  let reviews = await DormReview.aggregate()
    .match(queryObj)
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
  // populate _previousEdits to contain the actual edit data
  reviews = await DormReview.populate(reviews, { path: '_previousEdits' })
  ctx.ok({ reviews })
}

async function postReview (ctx) {
  if (!ctx.request.body.title || !ctx.request.body.body ||
    ctx.request.body.title.length < 5 || ctx.request.body.body.length < 20) {
    return ctx.badRequest('Please provide a longer title and/or review')
  }

  const d = await Dorm.findOne({ _id: ctx.params.id })
  if (d == null) {
    return ctx.notFound()
  }
  const review = new DormReview()
  review.title = ctx.request.body.title
  review._dorm = d
  review._author = ctx.state.user._id
  review.body = ctx.request.body.body
  review.save()
  ctx.created()
}

async function editReview (ctx) {
  if (ctx.request.body.title && ctx.request.body.title.length < 5) {
    return ctx.badRequest('Please provide a longer title')
  }
  if (ctx.request.body.body && ctx.request.body.body.length < 20) {
    return ctx.badRequest('Please provide a longer review')
  }

  const searchObj = { _id: ctx.params.id }
  if (!ctx.state.user.admin) { // Users can only edit their own reviews unless they're admin
    searchObj._author = ctx.state.user._id
  }
  const original = await DormReview.findOne(searchObj)
  if (original == null) {
    return ctx.notFound()
  }
  if (original.hasBeenEdited) {
    return ctx.send(409, { message: 'This message has been edited and this object is no longer available.' })
  }

  const newReview = new DormReview()
  newReview.title = ctx.request.body.title ? ctx.request.body.title : original.title
  newReview._dorm = original._dorm
  newReview._author = original._author
  newReview.body = ctx.request.body.body ? ctx.request.body.body : original.body
  newReview._previousEdits = original._previousEdits // Copy list of old edits & add the original to it
  newReview._previousEdits.push(original)
  original.hasBeenEdited = true
  original.save()
  newReview.save()

  // Update ratings to point to the new message
  const ratings = await DormRating.find({ _isFor: original._id })
  if (ratings) {
    ratings.forEach((r) => {
      r._isFor = newReview._id
      r.save()
    })
  }

  ctx.created()
}

async function deleteReview (ctx) {
  const searchObj = { _id: ctx.params.id }
  if (!ctx.state.user.admin) { // If the user isn't admin then they can only delete their own reviews
    searchObj._author = ctx.state.user._id
  }
  const review = await DormReview.findOne(searchObj)
  if (review == null) {
    return ctx.notFound()
  }
  if (review.hasBeenEdited) { // Cannot delete message if it is an outdated version of another message
    return ctx.send(409, { message: 'This message has been edited and this object is no longer available.' })
  }

  if (review._previousEdits) { // Delete previous instances of this review as well
    for (const prev of review._previousEdits) {
      await DormReview.deleteOne({ _id: prev._id })
    }
  }

  await DormReview.deleteOne({ _id: review._id })
  ctx.noContent()
}

async function voteOnReview (ctx) {
  const review = await DormReview.findOne({ _id: ctx.params.id })
  if (review == null) {
    return ctx.notFound()
  }
  let rating

  rating = await DormRating.findOne({
    _isFor: ctx.params.id,
    isForType: 'DormReview',
    _from: ctx.state.user._id
  })

  if (rating == null) {
    rating = new DormRating()
  }

  rating._from = ctx.state.user._id
  rating._isFor = review
  rating.isForType = 'DormReview'
  rating.value = ctx.request.body.value === 'POSITIVE' ? 1 : -1
  rating.save()
  ctx.noContent()
}

module.exports = {
  getReviews,
  postReview,
  editReview,
  deleteReview,
  voteOnReview
}
