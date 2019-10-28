const logger = require('../../../../modules/logger')
const DormQuestionAnswer = require('./dormquestionanswers.model')
const DormQuestion = require('../dormquestions.model')
const DormRating = require('../../dormratings/dormratings.model')

async function getAnswersForQuestion (ctx) {
  const queryObj = { _question: ctx.request.params.id }
  if (ctx.query.search) {
    queryObj.body = new RegExp('.*' + ctx.query.search + '.*', 'i')
  }

  const answers = await DormQuestionAnswer.find(queryObj)

  ctx.ok({ answers })
}

async function postAnswer (ctx) {
  if (!ctx.request.body.message || ctx.request.bod.message.length < 2) {
    return ctx.badRequest('Please provide a longer answer.')
  }
  const q = await DormQuestion.findOne({ _id: ctx.request.params.id })
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
  if (!ctx.request.body.message || ctx.request.bod.message.length < 2) {
    return ctx.badRequest('Please provide a longer answer.')
  }
  const original = await DormQuestionAnswer.findOne({ _id: ctx.request.params.id })
  if (original == null) {
    return ctx.notFound()
  }
  const newAnswer = new DormQuestionAnswer()
  newAnswer.body = ctx.request.body.message ? ctx.request.body.message : original.body
  newAnswer._author = original._author
  newAnswer._previousEdits.push(original)
  newAnswer._question = original._question
  newAnswer.save()
  ctx.created()
}

async function deleteAnswer (ctx) {
  const result = await DormQuestionAnswer.deleteOne({ _id: ctx.request.params.id })
  if (!result.deletedCount) {
    return ctx.notFound()
  }
  ctx.noContent()
}

async function voteOnAnswer (ctx) {
  const ans = await DormQuestionAnswer.findOne({ _id: ctx.request.params.id })
  if (ans == null) {
    return ctx.notFound()
  }
  let rating

  rating = await DormRating.findOne({
    _isFor: ctx.request.params.id,
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
