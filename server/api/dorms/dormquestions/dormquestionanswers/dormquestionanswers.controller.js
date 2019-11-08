const logger = require('../../../../modules/logger')
const DormQuestionAnswer = require('./dormquestionanswers.model')
const DormQuestion = require('../dormquestions.model')
const DormRating = require('../../dormratings/dormratings.model')

/**
 * Post a new question.
 * @param ctx {Koa context} body parameter "message" is used. "message" must be 2 characters or longer.
 * A question ID must be sent as a URL parameter. This question is the question this answer is answering.
 * @returns {Promise<void>}
 */
async function postAnswer (ctx) {
  if (!ctx.request.body.message || ctx.request.body.message.length < 2) {
    return ctx.badRequest('Please provide a longer answer.')
  }
  if (ctx.state.user.bannedFromPostingUntil > new Date()) {
    return ctx.unauthorized('You are currently banned from posting publicly!')
  }
  const q = await DormQuestion.findOne({ _id: ctx.params.id })
  if (q == null) {
    return ctx.notFound()
  }
  const ans = new DormQuestionAnswer()
  ans._question = q
  ans._author = ctx.state.user._id
  ans.body = ctx.request.body.message
  ans.save()
  ctx.created()
}

/**
 * Edit the passed answer. Requires a question ID as a parameter. Creates a new Message object and adds the old
 * version to the previousEdits. Also moves all ratings over to point to this new instance. Admins can edit any
 * answer, users can only edit their own.
 * @param ctx {Koa context}
 * @returns {Promise<*>}
 */
async function editAnswer (ctx) {
  if (!ctx.request.body.message || ctx.request.body.message.length < 2) {
    return ctx.badRequest('Please provide a longer answer.')
  }
  if (ctx.state.user.bannedFromPostingUntil > new Date()) {
    return ctx.unauthorized('You are currently banned from posting publicly!')
  }
  const searchObj = { _id: ctx.params.id }
  if (!ctx.state.user.admin) { // Users can only edit their own answers unless they're admin
    searchObj._author = ctx.state.user._id
  }
  const original = await DormQuestionAnswer.findOne(searchObj)
  if (original == null) {
    return ctx.notFound()
  }
  if (original.hasBeenEdited) { // Cannot delete message if it is an outdated version of another message
    return ctx.send(409, { message: 'This message has been edited and this object is no longer available.' })
  }

  const newAnswer = new DormQuestionAnswer()
  newAnswer.body = ctx.request.body.message ? ctx.request.body.message : original.body
  newAnswer._author = original._author
  newAnswer._previousEdits = original._previousEdits // Copy list of old edits & add the original to it
  newAnswer._previousEdits.push(original)
  newAnswer._question = original._question
  original.hasBeenEdited = true
  original.save()
  newAnswer.save()

  // Update ratings to point to the new message
  const ratings = await DormRating.find({ _isFor: original._id })
  if (ratings) {
    ratings.forEach((r) => {
      r._isFor = newAnswer._id
      r.save()
    })
  }
  ctx.created()
}

/**
 * Delete an answer. Requires an answer ID as a parameter. Does not delete ratings, however it does delete
 * previous versions of this message (_previousEdits). Admins can delete any question, users can only delete their own.
 * @param ctx {Koa context}
 * @returns {Promise<*>}
 */
async function deleteAnswer (ctx) {
  const searchObj = { _id: ctx.params.id }
  if (!ctx.state.user.admin) { // Users can only delete their own answers unless they're admin
    searchObj._author = ctx.state.user._id
  }
  const result = await DormQuestionAnswer.findOne(searchObj)
  if (result == null) {
    return ctx.notFound()
  }
  if (result.hasBeenEdited) { // Cannot delete message if it is an outdated version of another message
    return ctx.send(409, { message: 'This message has been edited and this object is no longer available.' })
  }

  if (result._previousEdits) { // Delete all previous versions of this question
    for (const prev of result._previousEdits) {
      await DormQuestionAnswer.deleteOne({ _id: prev._id })
    }
  }

  await DormQuestionAnswer.deleteOne({ _id: result._id })
  ctx.noContent()
}

/**
 * Vote on an answer either positively, negatively, or neutrally. A cumulative score is sent to the client of
 * all ratings added together when they GET all questions.
 * @param ctx {Koa context}
 * @returns {Promise<*>}
 */
async function voteOnAnswer (ctx) {
  const ans = await DormQuestionAnswer.findOne({ _id: ctx.params.id })
  if (ans == null) {
    return ctx.notFound()
  }
  let rating

  rating = await DormRating.findOne({
    _isFor: ctx.params.id,
    isForType: 'DormQuestionAnswer',
    _from: ctx.state.user._id
  })

  if (rating == null) {
    rating = new DormRating()
  }

  rating._from = ctx.state.user._id
  rating._isFor = ans
  rating.isForType = 'DormQuestionAnswer'
  rating.value = ctx.request.body.value === 'POSITIVE' ? 1 : ctx.request.body.value === undefined ? 0 : -1
  rating.save()
  ctx.noContent()
}

module.exports = {
  postAnswer,
  editAnswer,
  deleteAnswer,
  voteOnAnswer
}
