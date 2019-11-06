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
      },
      players: []
    }
  },
  created () {
    // init image
    this.img.src = './late.png'

    this.$socket.$subscribe('player movement send', data => {
      for (var i = 0; i < this.players.length; i++) {
        if (this.players[i].id === data.id) {
          switch (data.direction) {
            case 'left':
              this.players[i].direction.left = data.cond
              break
            case 'right':
              this.players[i].direction.right = data.cond
              console.log(this.players[i].direction.right)
              break
            case 'up':
              this.players[i].direction.up = data.cond
              break
            case 'down':
              this.players[i].direction.down = data.cond
              break
          }
          console.log(this.players[i].direction.right)
          return
        }
      }
    })

    this.$socket.$subscribe('player spawned', data => {
      this.players.push({
        id: data.id,
        direction: {
          left: false,
          right: false,
          up: false,
          down: false
        },
        position: {
          x: data.x,
          y: data.y
        }
      })
    })
  },
  mounted () {
    // add listeners
    document.addEventListener('keydown', () => { this.onKeyDown(event) })
    document.addEventListener('keyup', () => this.onKeyUp(event))

    // global canvas context
    this.context = this.$refs.game.getContext('2d')
    this.context.imageSmoothingEnabled = true

    this.sendPlayerSpawn()

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

      // handling other players
      for (var i = 0; i < this.players.length; i++) {
        let id = this.players[i].id
        let x = this.players[i].position.x
        let y = this.players[i].position.y

        // position
        if (this.players[i].direction.left) x -= 3
        if (this.players[i].direction.right) x += 3
        if (this.players[i].direction.up) y -= 3
        if (this.players[i].direction.down) y += 3

        // rendering
        this.context.fillStyle = '#000000'
        this.context.font = '20px serif'
        this.context.fillText(id, x, y - 5)
        this.context.drawImage(this.img, x, y, 50, 50)

        this.players[i].position.x = x
        this.players[i].position.y = y
      }

      this.context.fillStyle = '#000000'
      this.context.font = '20px serif'
      this.context.fillText(this.user.rcs_id, this.position.x, this.position.y - 5)
      this.context.drawImage(this.img, this.position.x, this.position.y, 50, 50)
    },
    onKeyDown (event) {
      // prevent scrolling
      if ([32, 37, 38, 39, 40].indexOf(event.keyCode) > -1) event.preventDefault()

      switch (event.code) {
        case 'KeyA':
          if (!this.keys.left) {
            this.direction.right = false
            this.direction.left = true
            this.keys.left = true
            this.sendMovementUpdate('left', true)
          }
          break
        case 'KeyD':
          if (!this.keys.right) {
            this.direction.left = false
            this.direction.right = true
            this.keys.right = true
            this.sendMovementUpdate('right', true)
          }
          break
        case 'KeyW':
          if (!this.keys.up) {
            this.direction.down = false
            this.direction.up = true
            this.keys.up = true
            this.sendMovementUpdate('up', true)
          }
          break
        case 'KeyS':
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
        case 'KeyA':
          this.direction.left = false
          this.keys.left = false
          this.sendMovementUpdate('left', false)
          break
        case 'KeyD':
          this.direction.right = false
          this.keys.right = false
          this.sendMovementUpdate('right', false)
          break
        case 'KeyW':
          this.direction.up = false
          this.keys.up = false
          this.sendMovementUpdate('up', false)
          break
        case 'KeyS':
          this.direction.down = false
          this.keys.down = false
          this.sendMovementUpdate('down', false)
          break
      }
    },
    sendMovementUpdate (dir, cond) {
      this.$socket.client.emit('player movement update', { id: this.user.rcs_id, direction: dir, cond: cond })
    },
    sendPlayerSpawn () {
      // send spawn event to server
      this.$socket.client.emit('player spawn update', { id: this.user.rcs_id, x: this.position.x, y: this.position.y })
    }
  }
}
</script>

<style scoped>
  .canvas {
    border: 1px solid black;
  }
</style>
