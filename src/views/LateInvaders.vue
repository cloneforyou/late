<template>
  <div>
    <canvas
      ref="game"
      class="canvas"
      width="1280"
      height="720"
    />
  </div>
</template>

<script>
export default {
  data () {
    return {
      context: {},
      FPS: 10,
      keys: {
        left: false,
        right: false,
        up: false,
        down: false
      },
      direction: {
        left: false,
        right: false,
        up: false,
        down: false
      },
      img: new Image(),
      position: {
        x: 20,
        y: 20
      }
    }
  },
  created () {
    // init image
    this.img.src = './late.png'

    this.$socket.$subscribe('position', (data) => {

    })
  },
  mounted () {
    // add listeners
    document.addEventListener('keydown', () => { this.onKeyDown(event) })
    document.addEventListener('keyup', () => this.onKeyUp(event))

    // global canvas context
    this.context = this.$refs.game.getContext('2d')
    this.context.imageSmoothingEnabled = true

    // start game loop
    setInterval(this.gameLoop, this.FPS)
  },
  methods: {
    gameLoop () {
      if (this.direction.left) this.position.x -= 3
      if (this.direction.right) this.position.x += 3
      if (this.direction.up) this.position.y -= 3
      if (this.direction.down) this.position.y += 3

      this.context.clearRect(0, 0, 1280, 720)
      this.context.fillStyle = '#FFFFFF'
      this.context.fillRect(0, 0, 1280, 720)
      this.context.drawImage(this.img, this.position.x, this.position.y, 50, 50)
    },
    onKeyDown (event) {
      // prevent scrolling
      if ([32, 37, 38, 39, 40].indexOf(event.keyCode) > -1) event.preventDefault()

      switch (event.code) {
        case 'ArrowLeft':
          if (!this.keys.left) {
            this.direction.right = false
            this.direction.left = true
            this.keys.left = true
            this.sendMovementUpdate('left', true)
          }
          break
        case 'ArrowRight':
          if (!this.keys.right) {
            this.direction.left = false
            this.direction.right = true
            this.keys.right = true
            this.sendMovementUpdate('right', true)
          }
          break
        case 'ArrowUp':
          if (!this.keys.up) {
            this.direction.down = false
            this.direction.up = true
            this.keys.up = true
            this.sendMovementUpdate('up', true)
          }
          break
        case 'ArrowDown':
          if (!this.keys.down) {
            this.direction.up = false
            this.direction.down = true
            this.keys.down = true
            this.sendMovementUpdate('down', true)
          }
          break
      }

      this.keyFired = true
    },
    onKeyUp (event) {
      this.keyFired = false

      switch (event.code) {
        case 'ArrowLeft':
          this.direction.left = false
          this.keys.left = false
          this.sendMovementUpdate('left', false)
          break
        case 'ArrowRight':
          this.direction.right = false
          this.keys.right = false
          this.sendMovementUpdate('right', false)
          break
        case 'ArrowUp':
          this.direction.up = false
          this.keys.up = false
          this.sendMovementUpdate('up', false)
          break
        case 'ArrowDown':
          this.direction.down = false
          this.keys.down = false
          this.sendMovementUpdate('down', false)
          break
      }
    },
    sendMovementUpdate (dir, cond) {
      this.$socket.client.emit('player movement update', { id: this.rcis_id, direction: dir, cond: cond })
    }
  }
}
</script>

<style scoped>
  .canvas {
    border: 1px solid black;
  }
</style>
