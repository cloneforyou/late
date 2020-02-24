const CourseSection = require('./course_sections.model')
const logger = require('../../modules/logger')
// const got = require('got')
const { JSDOM } = require('jsdom')

function getSections (document) {
  const rows = document.querySelectorAll('div > div > center table > tbody > tr')

  const periods = []
  let lastCRN
  let lastCourseSubjectCode
  let lastCourseNumber
  rows.forEach(row => {
    const pieces = []
    const tds = row.querySelectorAll('td')
    tds.forEach(td => pieces.push(td.textContent.trim()))

    if (pieces.length === 0 || !pieces[5]) return

    let [crn, summary] = pieces[0].split(' ')
    let courseSubjectCode, courseNumber, sectionId
    if (!crn || !summary) {
      // Change of section
      crn = lastCRN
      courseSubjectCode = lastCourseSubjectCode
      courseNumber = lastCourseNumber
    } else {
      [courseSubjectCode, courseNumber, sectionId] = summary.split('-')
    }

    periods.push({
      crn,
      courseSubjectCode,
      courseNumber,
      sectionId,
      periodType: pieces[2],
      credits: pieces[3],
      days: pieces[5].replace(/ /g, '').split('').map(letter => ({ M: 1, T: 2, W: 3, R: 4, F: 5 }[letter])),
      startTime: pieces[6],
      endTime: pieces[7],
      instructors: pieces[8].split('/'),
      location: pieces[9]
    })

    lastCRN = crn
    lastCourseSubjectCode = courseSubjectCode
    lastCourseNumber = courseNumber
  })

  return periods
}

module.exports.importCourseSections = async function importCourseSections (ctx) {
  const { termCode } = ctx.query

  const dom = await JSDOM.fromURL(`https://sis.rpi.edu/reg/zs${termCode}.htm`)

  ctx.body = JSON.stringify(getSections(dom.window.document))
}
