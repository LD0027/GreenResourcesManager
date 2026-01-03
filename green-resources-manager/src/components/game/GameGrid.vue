<template>
  <div class="games-grid" v-if="games.length > 0" :style="layoutStyles">
    <MediaCard 
      v-for="game in games" 
      :key="game.id" 
      :item="game" 
      type="game"
      :scale="scale"
      :is-running="isGameRunning(game)" 
      :is-electron-environment="isElectronEnvironment"
      :file-exists="game.fileExists" 
      @click="$emit('game-click', game)"
      @contextmenu="$emit('game-contextmenu', $event, game)" 
      @action="$emit('game-action', game)" 
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, type PropType, computed } from 'vue'
import MediaCard from '../MediaCard.vue'
import type { Game } from '../../types/game'

export default defineComponent({
  name: 'GameGrid',
  components: {
    MediaCard
  },
  props: {
    games: {
      type: Array as PropType<Game[]>,
      required: true,
      default: () => []
    },
    isGameRunning: {
      type: Function,
      required: true
    },
    isElectronEnvironment: {
      type: Boolean,
      default: false
    },
    scale: {
      type: Number,
      default: 100
    }
  },
  emits: ['game-click', 'game-contextmenu', 'game-action'],
  setup(props) {
    const layoutStyles = computed(() => {
      const s = props.scale
      return {
        '--card-scale': s / 100,
        '--show-stats': s < 30 ? 'none' : 'flex',
        '--show-icon': s < 20 ? 'none' : 'block',
        'grid-template-columns': `repeat(auto-fill, minmax(calc(280px * ${s / 100}), 1fr))`
      }
    })
    return { layoutStyles }
  }
})
</script>

<style scoped>
.games-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
  padding: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .games-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 15px;
  }
}
</style>

