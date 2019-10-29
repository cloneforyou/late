<template>
  <div>
    ha
  </div>
</template>

<script>
export default {
  data: () => ({
    length: 50,
    bullets: {},
    lost: false
  }),
  mounted: function () {
    location.hash = ''

    // add listeners
    document.addEventListener('keydown', () => { this.onKeyDown(event) })

    setInterval(this.gameLoop, 50)
  },
  methods: {
    gameLoop: function () {
      var board = '👉_____________________________________________'

      for (var i = 1; i < this.length; i++) {
        if (this.bullets[i]) {
          board[i] = '-'
          this.bullets.delete(i)
          this.bullets[i + 1] = {}
        }
      }

      location.hash = board
    },
    shoot: function () {
      console.log('SHOT!')
      this.bullets[1] = {}
    },
    onKeyDown: function (event) {
      if (event.code !== 'Space') return false
      this.shoot()
    },
    replaceAt: function (i, r) {

    }
  }
}
</script>

<style scoped>

</style>
