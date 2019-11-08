const Router = require('koa-router')
const router = new Router()

const Ctrl = require('./dorms.controller')
const PhotosCtrl = require('./dormphotos/dormphotos.controller')
const QuestionsIndex = require('./dormquestions/index')
const ReviewsIndex = require('./dormreviews/index')

const requireAdmin = function (ctx, next) {
  if (!ctx.state.user || !ctx.state.user.admin) return ctx.unauthorized('Must be logged in as an admin!')
  return next()
}

const requireLoggedIn = function (ctx, next) {
  if (!ctx.state.user) return ctx.unauthorized('You must be logged in to do this!')
  return next()
}

// Cannot nest already used routers - See issue https://github.com/ZijianHe/koa-router/issues/244
// router.use('/photos', require('./dormphotos'))
router.use('/questions', QuestionsIndex)
router.use('/reviews', ReviewsIndex)

router.get('/photos/:id', PhotosCtrl.getPhotosForDorm)
router.post('/photos/:id', requireLoggedIn, PhotosCtrl.postPhoto)
router.post('/photos/vote/:id', requireLoggedIn, PhotosCtrl.voteOnPhoto)
router.put('/photos/:id', requireLoggedIn, PhotosCtrl.editPhoto)
router.delete('/photos/:id', requireLoggedIn, PhotosCtrl.deletePhoto)

router.get('/', Ctrl.getDorms)
router.post('/vote/:id', requireLoggedIn, Ctrl.voteOnDorm)
router.get('/refresh', requireAdmin, Ctrl.refreshDormData)
router.post('/', requireAdmin, Ctrl.createDorm)
router.put('/:id', requireAdmin, Ctrl.updateDorm)
router.delete('/:id', requireAdmin, Ctrl.deleteDorm)

module.exports = router.routes()
