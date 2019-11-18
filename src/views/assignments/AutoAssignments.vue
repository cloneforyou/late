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

export default {
  components: {
    Draggable
  },
  props: {},
  data () {
    return {
      assignments: [],
      drag: false
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
    // get upcoming assignments from assessments
    this.assignments = this.$store.state.assessments.upcomingAssessments
      .filter(item => item.assessmentType === 'assignment' && item.fullyScheduled === false)
      .sort((a, b) => { return b.priority - a.priority })
  },
  methods: {
    submitAutoAssign () {
      this.autoAssign()

      this.$buefy.toast.open({
        type: 'is-success',
        message: 'Auto-scheduled your assignments!'
      })
    },
    autoAssign () {
      // get furthest assignment due date
      let furthest = this.assignments.reduce((max, a) =>
        a.dueDate > max ? a.dueDate : max, this.assignments[0].dueDate)

      // find # of days between now and furthest due date
      let dayspan = new Date(new Date(furthest) - new Date()).getDate()

      // create a map where each key is the date and value is a map representing 15-min time slots
      let timeMap = new Map()
      let curDate = new Date()
      for (let i = 0; i < dayspan; i++) {
        let newDateKey = new Date(curDate.getFullYear(), curDate.getMonth(), curDate.getDate() + i, 0, 0, 0, 0)
        timeMap.set(newDateKey, new Map())
      }

      // for latest - earliest, add

      console.log(this.$store.state)
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
