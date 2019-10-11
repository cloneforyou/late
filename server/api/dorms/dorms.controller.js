const logger = require('../../modules/logger')
const Dorm = require('./dorms.model')
const { scrapeForDormBuilding } = require('../../modules/dorm_scraping')

/**
 * Remove a dorm from the database. Requires body param _id
 * @param ctx {Koa context}
 * @returns {Promise<*>}
 */
async function deleteDorm (ctx) {
  if (!ctx.params || !ctx.params.id) {
    return ctx.badRequest('You must provide a dorm ID to delete.')
  }

  const d = await Dorm.findOne({ _id: ctx.params.id })
  if (!d) {
    return ctx.notFound('Dorm does not exist')
  }

  d.remove()
  logger.info('Deleted dorm ID ' + d._id + ' as requested by user ' + ctx.state.user.rcs_id)
  ctx.noContent()
}

/**
 * Create a dorm with the provided key or attributes. If no key is provided then
 * attributes for manual input are assumed.
 * @param ctx {Koa context}
 * @returns {Promise<*>}
 */
async function createDorm (ctx) {
  if (!ctx.request.body || (!ctx.request.body.key && !ctx.request.body.name)) {
    return ctx.badRequest('Missing required form data.')
  }

  if (typeof ctx.request.body.key === 'string') {
    await createAutomaticDorm(ctx)
  } else {
    await updateOrCreateDorm(ctx.request.body)
    ctx.ok()
  }
}

/**
 * Create a dorm document which employs automatic fetching of data from the student living website
 * @param ctx {Koa context}
 * @returns {Promise<*>}
 */
async function createAutomaticDorm (ctx) {
  if (typeof ctx.request.body.key !== 'string' || !ctx.request.body.key.match(/^[a-zA-Z0-9_-]{1,100}$/)) {
    return ctx.badRequest('Malformed required \'key\' parameter.')
  }

  let dormData
  try {
    dormData = await scrapeForDormBuilding(ctx.request.body.key)
  } catch (e) {
    logger.error('Error while fetching dorm data: ' + (e.message ? e.message : e))
    return ctx.send(502, 'Invalid response received from SLL.')
  }

  await updateOrCreateDorm({ ...dormData, key: ctx.request.body.key })
  ctx.created()
}

/**
 * Update a dorm with the passed values, or create one if a dorm with the passed ID does not exist/no ID is passed.
 * @param values Object containing values to insert into the dorm document. Only valid properties are accessed
 *               so no harm in passing more than necessary. Pass an object containing a valid _id if you want to
 *               update, or no _id if you want to create. Any values not passed will not be inserted/updated.
 * @returns {Promise<void>}
 */
async function updateOrCreateDorm (values) {
  let dorm = values._id ? await Dorm.findOne({ _id: values._id }) : null
  if (!dorm) {
    dorm = new Dorm()
  }

  // Properties that should be pulled from the values object if they exist and applied to the dorm
  const acceptedFields = ['_thumbnail', 'name', 'key', 'styles', 'roomTypes', 'hasThemeCommunity',
    'isCoEd', 'hasGenderInclusive', 'genderBreakdown', 'hasFloorRestrooms', 'hasRoomRestrooms',
    'hasCleaning', 'cleaningFrequency', 'hasGenderNeutralRestroom', 'furniture', 'amenities', 'closestDiningHall']
  // Properties that should be pulled from the values object and passed to parseInt before applying to dorm
  const intFields = ['perSuite', 'floorCount', 'occupancy', 'staffOccupancy']

  for (let i = 0; i < acceptedFields.length; i++) {
    const f = acceptedFields[i]
    dorm[f] = values[f] === undefined ? dorm[f] : values[f]
  }
  for (let i = 0; i < intFields.length; i++) {
    const f = intFields[i]
    if (values[f] === undefined) {
      continue
    }

    const intVal = parseInt(values[f])
    if (isNaN(intVal) || intVal === undefined) {
      continue
    }
    dorm[f] = intVal
  }
  await dorm.save()
}

/**
 * Update the provided dorm in <pre>ctx.request.body._id</pre> with the data in <pre>ctx.request.body</pre>
 * @param ctx {Koa context}
 */
async function updateDorm (ctx) {
  if (!ctx.request.body || !ctx.params.id) {
    return ctx.badRequest('Missing required form/param data.')
  }

  // Merge the ID passed via params into the values sent to updateOrCreateDorm
  await updateOrCreateDorm({ ...ctx.request.body, _id: ctx.params.id })
  ctx.ok()
}

/**
 * Refresh the dorm data for all dorms on the list (which aren't manually filled)
 * @param ctx {Koa context}
 */
async function refreshDormData (ctx) {
  const dorms = await Dorm.find({ key: { $exists: true } })
  if (!dorms) {
    return
  }

  console.log(dorms.length)

  for (let i = 0; i < dorms.length; i++) {
    await updateOrCreateDorm(await scrapeForDormBuilding(dorms[i].key))
  }
  ctx.ok()
}

/**
 * Get the list of all dorms to display, along with all of their attributes, and send it to the client
 * @param ctx {Koa context}
 * @returns {Promise<void>}
 */
async function getDorms (ctx) {
  const searchObj = {}
  if (ctx.query.search) {
    searchObj.name = new RegExp('.*' + ctx.query.search + '.*', 'i')
  }
  const dorms = await Dorm.find(searchObj)
  ctx.ok({ dorms })
}

module.exports = {
  getDorms,
  refreshDormData,
  updateDorm,
  deleteDorm,
  createDorm
}
