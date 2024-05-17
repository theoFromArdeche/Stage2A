<script setup>
const props = defineProps({
    receivedValue: {
        type: String,
        required: true,
    },
});
</script>

<template>
    <div>
        <p>{{ receivedValue }}</p>
    </div>
</template>