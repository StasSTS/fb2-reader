<template>
  <div class="reading-progress">
    <q-linear-progress
      :value="progress"
      class="q-mt-sm"
      rounded
      size="10px"
      :color="color"
    >
      <div class="absolute-full flex flex-center">
        <q-badge color="white" text-color="black" :label="`${progressPercent}%`" />
      </div>
    </q-linear-progress>
  </div>
</template>

<script>
import { defineComponent, computed } from 'vue'

export default defineComponent({
  name: 'ReadingProgress',
  props: {
    currentSection: {
      type: Number,
      required: true
    },
    totalSections: {
      type: Number,
      required: true
    }
  },
  setup(props) {
    const progress = computed(() => {
      if (props.totalSections === 0) return 0
      return props.currentSection / props.totalSections
    })

    const progressPercent = computed(() => {
      return Math.round(progress.value * 100)
    })

    const color = computed(() => {
      if (progress.value < 0.3) return 'red'
      if (progress.value < 0.7) return 'orange'
      return 'green'
    })

    return {
      progress,
      progressPercent,
      color
    }
  }
})
</script>

<style scoped>
.reading-progress {
  width: 100%;
  padding: 0 16px;
}
</style> 