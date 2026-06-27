<script setup lang="ts">
import { onMounted, ref, watch, onBeforeUnmount } from 'vue'
import { CountUp } from 'countup.js'

const props = withDefaults(defineProps<{ value: number; decimals?: number; duration?: number }>(), {
  decimals: 0, duration: 1
})
const el = ref<HTMLSpanElement | null>(null)
let cu: CountUp | null = null

onMounted(() => {
  if (!el.value) return
  cu = new CountUp(el.value, props.value, { decimalPlaces: props.decimals, duration: props.duration, useGrouping: true })
  cu.start()
})
watch(() => props.value, (v) => cu?.update(v))
onBeforeUnmount(() => { cu = null })
</script>

<template>
  <span ref="el">{{ value.toFixed(decimals) }}</span>
</template>
