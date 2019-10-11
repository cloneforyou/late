const request = require('request-promise')
const cheerio = require('cheerio')

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
   * Restrooms section
   */
  obj.hasFloorRestrooms = $('.restrooms td:contains("On Floor")').next().find('i').attr('aria-label') === 'Yes'
  obj.hasRoomRestrooms = $('.restrooms td:contains("In Room")').next().find('i').attr('aria-label') === 'Yes'
  obj.hasCleaning = $('.restrooms td:contains("Cleaning Available")').next().find('i').attr('aria-label') === 'Yes'
  obj.cleaningFrequency = $('.restrooms td:contains("Cleaning Schedule")').next().text().trim()
  obj.hasGenderNeutralRestroom = $('.restrooms td:contains("All-Gender Restroom Available")').next()
    .find('i').attr('aria-label') === 'Yes'

  /*
   * Furniture section
   */
  obj.furniture = []
  $('.furniture tr').each((index, e) => {
    const $furnitureItem = cheerio('td', e)
    const checkOrXIcon = $furnitureItem.next().find('i')
    obj.furniture.push({
      name: $furnitureItem.first().text().trim(),
      // If icon doesn't exist, assume true
      exists: checkOrXIcon.length ? $furnitureItem.next().find('i').attr('aria-label') === 'Yes' : true,
      description: $furnitureItem.next().text().trim()
    })
  })

  /*
   * Amenities section
   */
  obj.amenities = []
  $('.amenities tr').each((index, e) => {
    const $amenity = cheerio('td', e)
    const checkOrXIcon = $amenity.next().find('i')
    obj.amenities.push({
      name: $amenity.first().text().trim(),
      // If icon doesn't exist, assume true
      exists: checkOrXIcon.length ? checkOrXIcon.attr('aria-label') === 'Yes' : true,
      description: $amenity.next().text().trim()
    })
  })

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

  /*
   * Dining Hall section
   */
  obj.closestDiningHall = $('.dining td:contains("Nearest Dining Hall")').next().text().trim()

  return obj
}

module.exports = {
  scrapeForDormBuilding
}
