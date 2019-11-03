const logger = require('../../../../modules/logger')
const DormQuestionAnswer = require('./dormquestionanswers.model')
const DormQuestion = require('../dormquestions.model')
const DormRating = require('../../dormratings/dormratings.model')

async function getAnswersForQuestion (ctx) {
  const queryObj = { _question: ctx.params.id, hasBeenEdited: false }
  if (ctx.query.search) { // fixme ReDoS vulnerability?
    queryObj.body = new RegExp('.*' + ctx.query.search + '.*', 'i')
  }

  const answers = await DormQuestionAnswer.find(queryObj)

  ctx.ok({ answers })
}

async function postAnswer (ctx) {
  if (!ctx.request.body.message || ctx.request.body.message.length < 2) {
    return ctx.badRequest('Please provide a longer answer.')
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

async function editAnswer (ctx) {
  if (!ctx.request.body.message || ctx.request.body.message.length < 2) {
    return ctx.badRequest('Please provide a longer answer.')
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
  ctx.created()
}

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
  rating.value = ctx.request.body.value === 'POSITIVE' ? 'POSITIVE' : 'NEGATIVE'
  rating.save()
  ctx.noContent()
}

module.exports = {
  getAnswersForQuestion,
  postAnswer,
  editAnswer,
  deleteAnswer,
  voteOnAnswer
}
