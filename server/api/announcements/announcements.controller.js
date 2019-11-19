const Announcement = require('./announcements.model')
const logger = require('../../modules/logger')

/**
 * Get a list of announcements
 * @returns {Promise<Aggregate<Announcement[]>>} An array of Announcement objects
 */
async function getAnnouncements () {
  return Announcement.aggregate()
    .lookup({
      from: 'students',
      let: { studentId: '$_student' },
      pipeline: [
        { $match: { $expr: { $eq: ['$$studentId', '$_id'] } } },
        { $project: { name: 1 } }
      ],
      as: '_student'
    })
}

/**
 * Save an announcement. Assumes the provided _student has permission to create an announcement.
 * @param params {{_student: {_id: Object} | String, isPinned?: boolean, title: String, body: String}}
 *    Announcement Schema parameters
 * @returns {Promise<Announcement>} The created announcement object.
 *    Not sanitized! May include sensitive user info in _student.
 * @throws Error if the announcement failed to save.
 */
async function createAnnouncement (params) {
  const createdAnnouncement = Announcement({
    ...params
  })
  await createdAnnouncement.save()
  return createdAnnouncement
}

/**
 * Edit a given announcement.
 * @param id {String} the ID of the announcement you want to edit
 * @param params {{body?: String, isPinned?: boolean, title?: String}} Announcement parameters you want to change
 * @returns {Promise<Announcement>} The edited announcement
 * @throws Error if the provided Announcement ID does not exist
 * @throws Error if something went wrong while saving the provided Announcement
 */
async function editAnnouncement (id, params) {
  const announcement = await Announcement.findOne({
    _id: id
  })
  if (!announcement) {
    const err = new Error('Could not find an announcement with the provided ID!')
    err.code = 'MISSING'
    throw err
  }

  announcement.title = params.title === undefined ? announcement.title : params.title
  announcement.body = params.body === undefined ? announcement.body : params.body
  announcement.isPinned = params.isPinned === undefined ? announcement.isPinned : params.isPinned

  announcement.save()
  return announcement
}

/**
 * Delete an announcement
 * @param id The MongoDB ObjectId of the announcement to delete
 * @returns {Promise<void>}
 * @throws Error on MongoDB error, or if the object does not exist.
 */
async function deleteAnnouncement (id) {
  const result = await Announcement.deleteOne({ _id: id })

  if (result.n < 1) {
    const err = new Error('Announcement does not exist!')
    err.code = 'NOTFOUND'
    throw err
  }
}

module.exports = {
  getAnnouncements,
  editAnnouncement,
  createAnnouncement,
  deleteAnnouncement
}
