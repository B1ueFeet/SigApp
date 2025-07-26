<!-- src/pages/IndexPage.vue -->
<template>
  <q-page class="column q-gutter-md">
    <client-form />
    <product-form />
  </q-page>
</template>

<script>
import ClientForm from 'components/ClientForm.vue'
import ProductForm from 'components/ProductForm.vue'

export default {
  name: 'IndexPage',
  components: { ClientForm, ProductForm }
}
</script>
