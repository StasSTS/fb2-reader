<template>
  <q-dialog v-model="isOpen" persistent>
    <q-card style="min-width: 350px">
      <q-card-section>
        <div class="text-h6">Заметка</div>
      </q-card-section>

      <q-card-section class="q-pt-none">
        <q-input
          v-model="noteText"
          type="textarea"
          autofocus
          @keyup.enter="save"
        />
      </q-card-section>

      <q-card-actions align="right" class="text-primary">
        <q-btn flat label="Отмена" v-close-popup />
        <q-btn flat label="Сохранить" @click="save" v-close-popup />
      </q-card-actions>
    </q-card>
  </q-dialog>
</template>

<script>
import { defineComponent, ref, watch } from 'vue'

export default defineComponent({
  name: 'BookNote',
  props: {
    modelValue: {
      type: Boolean,
      required: true
    },
    initialNote: {
      type: String,
      default: ''
    }
  },
  emits: ['update:modelValue', 'save'],
  setup(props, { emit }) {
    const isOpen = ref(props.modelValue)
    const noteText = ref(props.initialNote)

    watch(() => props.modelValue, (val) => {
      isOpen.value = val
    })

    watch(isOpen, (val) => {
      emit('update:modelValue', val)
    })

    const save = () => {
      emit('save', noteText.value)
    }

    return {
      isOpen,
      noteText,
      save
    }
  }
})
</script> 