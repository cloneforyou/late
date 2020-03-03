<template>
  <b-modal
    has-modal-card
    class="modal tours-modal"
    :active="open"
    @close="$emit('close-modal')"
  >
    <div class="modal-card">
      <header class="modal-card-head">
        <p class="modal-card-title">
          Feature Tours
        </p>
      </header>
      <section class="modal-card-body">
        <h1
          class="is-size-5 is-fullwidth has-text-centered"
          style="margin-bottom: 15px;"
        >
          Learn the in's and out's of LATE with these helpful tours!
        </h1>
        <button
          v-for="(tour, index) in tours"
          :key="index"
          class="tour button is-medium is-fullwidth"
          @click="startTour(index)"
        >
          {{ tour.title }}
        </button>
      </section>
      <footer class="modal-card-foot">
        <b-button @click="$emit('close-modal')">
          Close
        </b-button>
      </footer>
    </div>
  </b-modal>
</template>

<script>
export default {
  name: 'ToursModal',
  props: {
    open: { type: Boolean, required: true }
  },
  computed: {
    tours () {
      return this.$store.state.tours.tours
    }
  },
  methods: {
    startTour (index) {
      const tour = this.tours[index]

      if (tour.route && tour.route.name !== this.$route.name) this.$router.push(tour.route)
      this.$store.commit('TOGGLE_TOURS_MODAL')
      this.$store.commit('SET_TOUR_INDEX', index)
    }
  }
}
</script>

<style lang="scss" scoped>

.modal-card-body {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-content: space-around;
}

.tour {
  margin-bottom: 10px;
  flex: 1 1 auto;
  flex-basis: 120px;
  min-height: 50px;
  min-width: 45%;
  margin: 5px;

}
.tour:hover {
  transition: 0.2;
  background-color: #dbdbdb
}
</style>
