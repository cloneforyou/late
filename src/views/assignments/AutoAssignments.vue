<template>
  <div>
    <form action="">
      <div
        class="modal-card"
        style="width: auto"
      >
        <header class="modal-card-head">
          <p class="modal-card-title">
            Auto-Assign Assignments
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
                {{ element.id }}
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
      assignments: [
        {
          id: 'Aidan'
        },
        {
          id: 'Caleb'
        },
        {
          id: 'Justin'
        },
        {
          id: 'Ryan'
        }
      ],
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
  methods: {
    autoAssign () {

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
  background-image: linear-gradient(-20deg, #fc6076 0%, #ff9a44 100%);
  margin-bottom: 0.5em;
}

.index {
  float: right;
  border-radius: 50% !important;
  width: 10%;
  height: 10%;
  padding: 0px;
  background-image: linear-gradient(-20deg, #fc6076 0%, #ff9a44 100%);
  color: #ffffff;
  text-align: center;
}
</style>
