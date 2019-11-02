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
  created () {
    var img = new Image()
    img.src = './public/img/icons/favicon-32x32.png'
    this.$socket.$subscribe('position', (data) => {
      this.position = data
      this.context.clearRect(0, 0, this.$refs.game.width, this.$refs.game.height)
      this.context.fillStyle = '#FFFFFF'
      this.context.fillRect(0, 0, this.$refs.game.width, this.$refs.game.width)
      this.context.fillStyle = '#000000'
      this.context.fillRect(this.position.x, this.position.y, 20, 20)
      this.context.drawImage(img, 50, 50)
    })
  },
  mounted () {
    // add listeners
    document.addEventListener('keydown', () => { this.onKeyDown(event) })

    // global canvas context
    this.context = this.$refs.game.getContext('2d')
    this.context.imageSmoothingEnabled = false
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
      this.$socket.client.emit('move', direction)
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
