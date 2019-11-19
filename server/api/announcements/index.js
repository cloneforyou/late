const Router = require('koa-router')
const router = new Router()
const logger = require('../../modules/logger')

const Ctrl = require('./announcements.controller')

/**
 * Check if a passed ID is a valid MongoDB ObjectId. Does not necessarily have to correlate to an object,
 * just has to be in the proper format of a 24-char hexadecimal string.
 * @param id {String} MongoDB ObjectId to check
 */
function isValidMongoId (id) {
  return !/[a-f0-9]{24}/i.test(id)
}

/**
 * Request middleware requiring a user is an admin before advancing.
 * @param ctx {*} Koa context
 * @param next {function} Callback to run the next middleware
 * @returns {*}
 */
const requireAdmin = function (ctx, next) {
  if (!ctx.state.user || !ctx.state.user.admin) return ctx.unauthorized('Must be logged in as an admin!')
  return next()
}

/**
 * Handler for POST / - Create announcement.
 * @param ctx {*} Koa context
 * @returns {Promise<void>}
 */
async function createAnnouncementHandler (ctx) {
  const { title, body, isPinned } = ctx.request.body
  try {
    const result = await Ctrl.createAnnouncement({ _student: ctx.state.user, title, body, isPinned })
    logger.info(`Added announcement for ${ctx.state.user.identifier}`)
    ctx.created({ result })
  } catch (e) {
    logger.error(`Failed to save new announcement for ${ctx.state.user.identifier}: ${e}`)
    ctx.internalServerError('There was an error adding the announcement.')
  }
}

/**
 * Handler for PATCH /:announcementID - Edit announcement.
 * @param ctx {*} Koa context
 * @returns {Promise<void>}
 */
async function editAnnouncementHandler (ctx) {
  if (!ctx.params || !isValidMongoId(ctx.params.announcementID)) {
    return ctx.badRequest('Malformed Announcement ID!')
  }

  const { title, body, isPinned } = ctx.request.body
  try {
    const result = await Ctrl.editAnnouncement(ctx.params.announcementID, { title, body, isPinned })
    logger.info(`User ${ctx.state.user.identifier} edited an announcement`)
    ctx.created({ result })
  } catch (e) {
    logger.error(`Failed to save new announcement for ${ctx.state.user.identifier}: ${e}`)
    if (e.code === 'MISSING') {
      ctx.badRequest(e.message)
    } else {
      ctx.internalServerError('There was an error while saving your changes.')
    }
  }
}

/**
 * Handler for DELETE /:announcementID - Delete an announcement
 * @param ctx {*} Koa context
 * @returns {Promise<*>}
 */
async function deleteAnnouncementHandler (ctx) {
  if (!ctx.params || !isValidMongoId(ctx.params.announcementID)) {
    return ctx.badRequest('Malformed Announcement ID!')
  }
  try {
    await Ctrl.deleteAnnouncement(ctx.params.announcementID)
    logger.info(`Deleted announcement for ${ctx.state.user.identifier}`)
    ctx.noContent()
  } catch (e) {
    logger.error(`Failed to delete announcement for ${ctx.state.user.identifier}: ${e}`)
    if (e.code === 'NOTFOUND') {
      ctx.badRequest(e.message)
    } else {
      ctx.internalServerError('There was an error while deleting that announcement.')
    }
  }
}

router.get('/', async (ctx) => {
  ctx.ok({ announcements: await Ctrl.getAnnouncements() })
})
router.post('/', requireAdmin, createAnnouncementHandler)
router.patch('/:announcementID', requireAdmin, editAnnouncementHandler)
router.delete('/:announcementID', requireAdmin, deleteAnnouncementHandler)

module.exports = router.routes()
