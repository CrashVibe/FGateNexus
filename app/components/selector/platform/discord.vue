<script lang="ts" setup>
import type { DiscordConfig } from "#shared/model/bot/schema/discord";
import { DiscordConfigSchema } from "#shared/model/bot/schema/discord";

const emit = defineEmits<{ submit: [] }>();

const modelValue = defineModel<DiscordConfig>({ required: true });

const formRef = useTemplateRef("formRef");

defineExpose({
  submit: () => formRef.value?.submit(),
});
</script>

<template>
  <UForm
    ref="formRef"
    :schema="DiscordConfigSchema"
    :state="modelValue"
    @submit="emit('submit')"
    class="grid grid-cols-1 gap-4 md:grid-cols-2"
  >
    <UFormField label="Token" name="token" required class="md:col-span-2">
      <UInput
        v-model="modelValue.token"
        class="w-full"
        placeholder="请输入 Discord Bot Token"
      />
    </UFormField>
  </UForm>
</template>
