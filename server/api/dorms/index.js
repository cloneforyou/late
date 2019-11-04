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

// Cannot nest already used routers - See issue https://github.com/ZijianHe/koa-router/issues/244
// router.use('/photos', require('./dormphotos'))
router.use('/questions', QuestionsIndex)
router.use('/reviews', ReviewsIndex)

router.get('/photos/', PhotosCtrl.getDormPhotos)
// router.get('/photos/:dormPhotoID', PhotosCtrl.getDormPhoto)
router.post('/photos/', PhotosCtrl.uploadDormPhoto)
router.post('/photos/:dormPhotoID/confirm', requireAdmin, PhotosCtrl.confirmDormPhoto)
router.delete('/photos/:dormPhotoID', requireAdmin, PhotosCtrl.removeDormPhoto)

router.get('/', Ctrl.getDorms)
router.post('/vote/:id', Ctrl.voteOnDorm)
router.get('/refresh', requireAdmin, Ctrl.refreshDormData)
router.post('/', requireAdmin, Ctrl.createDorm)
router.put('/:id', requireAdmin, Ctrl.updateDorm)
router.delete('/:id', requireAdmin, Ctrl.deleteDorm)

module.exports = router.routes()
