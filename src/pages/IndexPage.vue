<template>
  <q-page class="row justify-center">
    <client-form />
  </q-page>
</template>

<script>
import ClientForm from 'components/ClientForm.vue'

export default {
  name: 'IndexPage',
  components: { ClientForm }
}
</script>
