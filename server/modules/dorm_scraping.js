const request = require('request-promise')
const cheerio = require('cheerio')

const logger = require('./logger')

const SLL_BUILDING_URL = 'https://sll.rpi.edu/buildings/' // + key

async function scrapeForDormBuilding (key) {
  // Has key information/attributes about the requested dorm
  const obj = {}

  const $ = await request({
    uri: SLL_BUILDING_URL + key,
    transform: body => cheerio.load(body)
  })

  /*
   * Header info
   */
  obj.name = $('#block-paperclip-page-title').text().split(':')[0].trim()
  obj.year = $('h2.class-year').text().split(' ')[0]

  /*
   * Community information section
   */
  obj.styles = $('.community-info td:contains("Building Type")').next().text().trim().split('/')
  obj.perSuite = parseInt($('.community-info td:contains("Students per suite/apartment")').next().text().trim())
  obj.occupancy = parseInt($('.community-info td:contains("# of Occupants")').next().text().trim())
  obj.staffOccupancy = parseInt($('.community-info td:contains("# of Student Staff per building")').next().text().trim())
  obj.floorCount = parseInt($('.community-info td:contains("# of Floors")').next().text().trim())
  obj.hasThemeCommunity = $('.community-info td:contains("Theme Community Available")').next()
    .find('i').attr('aria-label') === 'Yes'
  obj.isCoEd = $('.community-info td:contains("Co-Ed Building")').next().find('i').attr('aria-label') === 'Yes'
  obj.hasGenderInclusive = $('.community-info td:contains("Gender Inclusive Housing Available")')
    .next().find('i').attr('aria-label') === 'Yes'
  obj.genderBreakdown = $('.community-info td:contains("Gender Breakdown")').next().text().trim()

  /*
   * Room types section
   */
  obj.roomTypes = []
  // Get all of the room types
  $('.room-types .table tr').each((index, e) => {
    if (cheerio.load(e).text().includes('$')) { // If this row contains a $ then assume it is available
      obj.roomTypes.push({
        name: cheerio('td', e).first().text().trim().split('\n')[0], // First part of first column
        // Second part of first column
        area: parseInt(cheerio('td', e).first().text().trim().split('\n')[1].replace(/[^\d]/g, '')),
        // Second column
        price: parseInt(cheerio('td', e).last().text().trim().split('\n')[0].replace(/[^\d]/g, ''))
      })
    }
  })

  return obj
}

module.exports = {
  scrapeForDormBuilding
}
