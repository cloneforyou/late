<template>
  <div>
    <canvas
      ref="game"
      class="canvas"
    />
  </div>
</template>

<script>
export default {
  data () {
    return {
      context: {},
      position: {
        x: 0,
        y: 0
      }
    }
  },
  mounted () {
    // add listeners
    document.addEventListener('keydown', () => { this.onKeyDown(event) })

    this.context = this.$refs.game.getContext('2d')
    this.$socket.on('position', data => {
      this.position = data
      this.context.clearRect(this.$refs.game.width, this.$refs.game.height)
      this.context.fillstyle = '#FFFFFF'
      this.fillRect(0, 0, this.$refs.game.width, this.$refs.game.height)
      this.context.fillstyle = '#000000'
      this.fillRect(this.position.x, this.position.y, 20, 20)
    })
  },
  methods: {
    onKeyDown (event) {
      switch (event.code) {
        case 'ArrowLeft':
          this.move('left')
          break
        case 'ArrowRight':
          this.move('right')
          break
        case 'ArrowUp':
          this.move('up')
          break
        case 'ArrowDown':
          this.move('down')
          break
      }
    },
    move (direction) {
      this.$socket.emit('move', direction)
    }
  }
}
</script>

<style scoped>
  .canvas {
    width: 90%;
    height: 50%;
    border: 1px solid black;
  }
</style>
