<template>
  <div>
    <form action="">
      <div
        class="modal-card"
        style="width: auto"
      >
        <header class="modal-card-head">
          <p class="modal-card-title">
            Auto-Schedule Assignments
          </p>
        </header>
        <section class="modal-card-body">
          <header class="assignments-header">
            Assignment Priorities:
          </header>
          <Draggable
            v-model="assignments"
            class="list-group"
            tag="ul"
            v-bind="dragOptions"
            @start="drag=true"
            @end="drag=false"
          >
            <transition-group
              type="transition"
              :name="!drag ? 'flip-list' : null"
            >
              <li
                v-for="(element, index) in assignments"
                :key="element.id"
                class="list-group-item"
              >
                {{ element.title }}
                <div class="index">
                  {{ index + 1 }}
                </div>
              </li>
            </transition-group>
          </Draggable>
          <section>
            <b-field
              style="margin-top: 4%;"
              label="Max time allotment (hours):"
            >
              <b-slider
                v-model="maxTime"
                :min="0.5"
                :max="4"
                :step="0.5"
                ticks
                rounded
              />
            </b-field>
          </section>
        </section>
        <footer class="modal-card-foot">
          <b-button @click="$parent.close()">
            Cancel
          </b-button>
          <b-button
            type="is-primary"
            @click="submitAutoAssign()"
          >
            Submit
          </b-button>
        </footer>
      </div>
    </form>
  </div>
</template>

<script>
import Draggable from 'vuedraggable'
const { shuffle } = require('weighted-shuffle')

export default {
  components: {
    Draggable
  },
  props: {},
  data () {
    return {
      assignments: [],
      drag: false,
      maxTime: 1 // in hours
    }
  },
  computed: {
    dragOptions () {
      return {
        animation: 200,
        group: 'assignments',
        disabled: false,
        ghostClass: 'ghost'
      }
    }
  },
  mounted () {
    console.log(this.$store.state)
    // get upcoming assignments from assessments
    this.assignments = this.$store.state.assessments.upcomingAssessments
      .filter(item => item.assessmentType === 'assignment' && item.fullyScheduled === false)
      .sort((a, b) => { return b.priority - a.priority })
  },
  methods: {
    submitAutoAssign () {
      let timeMap = this.generateFreeTimeTable()
      let weighted = this.weightedShuffle()
      this.assignSlots(timeMap, weighted)

      this.$buefy.toast.open({
        type: 'is-success',
        message: 'Auto-scheduled your assignments!'
      })
    },
    generateFreeTimeTable () {
      // get furthest assignment due date
      let furthest = this.assignments.reduce((max, a) =>
        a.dueDate > max ? a.dueDate : max, this.assignments[0].dueDate)

      // find # of days between now and furthest due date
      let dayspan = Math.ceil((new Date(furthest).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000))

      // create a map where each key is the date and value is a map representing 15-min time slots
      let timeMap = new Map()
      let curDate = new Date()

      let start = parseInt(this.user.earliestWorkTime.replace(':', ''))
      let end = parseInt(this.user.latestWorkTime.replace(':', ''))

      let classes = this.$store.state.schedule.courses
      let classDayMap = new Map()
      // init class day map to size of week
      for (let i = 0; i < 7; i++) classDayMap.set(i, [])

      // gets periods from each course and puts in week array
      for (let i = 0; i < classes.length; i++) {
        let periods = classes[i].periods
        for (let j = 0; j < periods.length; j++) {
          if (periods[j].type !== 'LEC') continue
          classDayMap.get(periods[j].day).push({ start: parseInt(periods[j].start), end: parseInt(periods[j].end) })
        }
      }

      // add unavailabilities
      let ua = this.$store.state.unavailability.unavailabilities
      for (let i = 0; i < ua.length; i++) {
        let days = ua[i].daysOfWeek
        for (let j = 0; j < days.length; j++) {
          classDayMap.get(days[j]).push({ start: parseInt(ua[i].startTime.replace(':', '')),
            end: parseInt(ua[i].endTime.replace(':', '')) })
        }
      }

      // create a hash map representation of all free 15-min time blocks in each day from dayspan
      for (let d = 0; d < dayspan; d++) {
        let newDateKey = new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate() + d, 0, 0, 0, 0)
        let map = new Map()

        for (let i = start; i < end; i += 15) {
          if (i % 100 === 60) i += 40 // handle time format

          let takenBlocks = classDayMap.get(newDateKey.getDay())

          var conflict = false
          for (let j = 0; j < takenBlocks.length; j++) {
            if (i >= takenBlocks[j].start && i < takenBlocks[j].end) {
              conflict = true
            }
          }

          if (!conflict) map.set(i)
        }
        timeMap.set(newDateKey, map)
      }

      return timeMap
    },
    weightedShuffle () {
      let tuples = []

      // assign weights
      for (let i = 0; i < this.assignments.length; i++) {
        let pre = this.assignments[i].priority
        let post = i
        let timeLeft = Math.ceil((new Date(this.assignments[i].dueDate).getTime() -
          new Date().getTime()) / (24 * 60 * 60 * 1000))
        let hours = this.assignments[i].timeEstimate

        var weight = (1.0 / timeLeft) * 10 + (2 * pre + post) * 1.5 + hours

        // divide each assigment into smaller blocks based on maxTime
        var time = this.maxTime
        for (let j = 0; j < this.assignments[i].timeEstimate; j += this.maxTime) {
          if (this.assignments[i].timeEstimate - j < this.maxTime) {
            time = this.assignments[i].timeEstimate - j
          }
          tuples.push([{ id: this.assignments[i].id, time: time }, weight + j])
        }
      }

      // perform weighted shuffle algorithm on assignments
      return shuffle(tuples, 'desc')
    },
    async assignSlots (timeMap, weighted) {
      // starting number to try and evenly distibute blocks across the schedule
      let average = Math.ceil(weighted.length / timeMap.size)
      console.log(weighted)

      var currentDay = 0
      var timeMapValItr = timeMap.values()
      var timeMapKeyItr = timeMap.keys() // to get current assignment date

      while (currentDay < timeMap.size) {
        let currentDayKey = timeMapKeyItr.next().value
        let timeMapVal = timeMapValItr.next().value

        let daySize = timeMapVal.size
        let dayStep = Math.ceil(daySize / (this.maxTime * 60 / 4))

        for (let i = 0; i < average; i++) {
          if (weighted.length === 0) break

          let canFit = false
          let timeFit = 0
          let dayItr = timeMapVal.keys() // reset day iterator
          while (!canFit) {
            timeFit = dayItr.next().value
            canFit = this.canFit(timeMapVal, timeFit, weighted[i][0].time * 60 / 4)
          }

          // timeFit represents a starting time that works for the current block
          // delete time slots to now mark as unavailable
          let deleteTime = timeFit
          for (let j = 0; j < weighted[i][0].time * 60 / 15; j += 15) {
            timeMapVal.delete(deleteTime)
            deleteTime += 15
            if (deleteTime % 100 === 60) deleteTime += 40
          }

          let startTime = new Date(currentDayKey)
          startTime.setHours(Math.floor(timeFit / 100))
          startTime.setMinutes(timeFit % 100)
          startTime.setSeconds(0)

          let endTime = new Date(currentDayKey)
          let addedTime = timeFit
          for (let j = 0; j < Math.floor(weighted[i][0].time * 60 / 15); j += 15) {
            addedTime += 15
            if (addedTime % 100 === 60) addedTime += 40 // handle time trsnformation
          }
          endTime.setHours(Math.floor(addedTime / 100))
          endTime.setHours(addedTime % 100)
          endTime.setSeconds(0)
          // post new block
          // this.$http.post('/blocks/assignment/' + weighted[i][0], { startTime: 0, endTime: 0, shared: true })
        }

        currentDay++
      }
    },
    /**
     * Returns (false, nextTime) if timeAmount starting at start, cannot fit in a given day
     *  nextTime is the next time slot after the check is made
     * Returns (true, start) if it can fit in given time
     */
    canFit (timeMapDay, start, timeAmount) {
      // incrementor (15) is size of time block
      var i = start
      for (; i < start + timeAmount; i += 15) {
        if (!timeMapDay.has(i)) return (false, i + timeAmount)
      }
      return true
    }
  }
}
</script>

<style>
ul {
  list-style-type: disc;
}

.flip-list-move {
  transition: transform 0.5s;
}

.no-move {
  transition: transform os;
}

.ghost {
  opacity: 0.5;
  background: #c8ebfb;
}

.list-group {
  min-height: 20px;
}

.list-group-item:first-child {
  border-top-left-radius: .25rem;
  border-top-right-radius: .25rem;
}

.list-group-item {
  cursor: move;
  position: relative;
  display: block;
  padding: .75rem 1.25rem;
  margin-bottom: -1px;
  background-color: #fff;
  border: 1px solid rgba(0, 0, 0, .125);
  font-size: 1.3em;
  font-weight: 400;
}

.list-group-item i {
  cursor: pointer;
}

.assignments-header {
  font-size: 2em;
  color: white;
  text-align: center;
  padding: 3px;
  border-radius: 5px;
  background-image: linear-gradient(-20deg, #fc6076 20%, #ff9a44 100%);
  margin-bottom: 0.5em;
}

.index {
  float: right;
  border-radius: 50% !important;
  width: 1.5em;
  height: 1.5em;
  padding: 0px;
  background-image: linear-gradient(-20deg, #fc6076 0%, #ff9a44 100%);
  color: #ffffff;
  text-align: center;
}
</style>
