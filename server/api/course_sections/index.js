const Router = require('koa-router')
const router = new Router()

const Ctrl = require('./course_sections.controller')

router.get('/import', Ctrl.importCourseSections)

module.exports = router.routes()
