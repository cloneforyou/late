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
          Choose assignment Priority:
          <Draggable
            v-model="array"
            group="?"
            @start="drag=true"
            @end="drag=false"
          >
            <div
              v-for="element in array"
              :key="element.id"
            >
              {{ element.id }}
            </div>
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

    }
  },
  methods: {
    autoAssign () {

    }
  }
}
</script>

<style>
</style>
