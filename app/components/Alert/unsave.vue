<template>
  <Transition mode="out-in" name="alert-slide">
    <n-alert v-if="show" class="rounded-lg" closable title="你有未保存到更改" type="warning" @close="handleClose">
      <template #default>
        <div class="flex items-center justify-between">
          <n-text strong>请选择保存或丢弃您的更改</n-text>
          <div class="flex gap-2">
            <n-button :disabled="saving" :loading="saving" ghost size="small" type="primary" @click="handleSave">
              {{ saveText }}
            </n-button>
            <n-button :disabled="saving" :loading="saving" size="small" @click="handleDiscard">
              {{ discardText }}
            </n-button>
          </div>
        </div>
      </template>
    </n-alert>
  </Transition>
</template>

<script lang="ts" setup>
interface Props {
  show: boolean;
  saving?: boolean;
  message?: string;
  saveText?: string;
  discardText?: string;
}

interface Emits {
  save: [];
  discard: [];
  close: [];
}

withDefaults(defineProps<Props>(), {
  saving: false,
  message: "您有未保存的更改",
  saveText: "保存更改",
  discardText: "放弃更改"
});

const emit = defineEmits<Emits>();

const handleSave = () => {
  emit("save");
};

const handleDiscard = () => {
  emit("discard");
};

const handleClose = () => {
  emit("close");
};
</script>

<style scoped>
.alert-slide-enter-active,
.alert-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
}
.alert-slide-enter-from {
  opacity: 0;
  transform: translateY(-20px);
  max-height: 0;
  margin-bottom: 0;
  overflow: hidden;
}
.alert-slide-leave-to {
  opacity: 0;
  transform: translateY(-20px);
  max-height: 0;
  margin-bottom: 0;
  overflow: hidden;
}
.alert-slide-enter-to,
.alert-slide-leave-from {
  opacity: 1;
  transform: translateY(0);
  max-height: 200px;
  margin-bottom: 16px;
}
</style>
