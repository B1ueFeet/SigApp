<!-- src/pages/IndexPage.vue -->
<template>
  <q-page padding>
    <client-form />

    <q-card class="q-mt-lg">
      <q-card-section class="row items-center q-gutter-sm">
        <q-select
          v-model="selectedProdId"
          :options="productOptions"
          option-value="id"
          option-label="common_name"
          label="Selecciona producto"
          emit-value
          map-options
          style="width: 300px"
          @update:model-value="onSelectProduct"
        />

        <q-input
          v-model.number="itemQuantity"
          type="number"
          label="Cantidad"
          style="width: 120px"
          @input="onQuantityInput"
        />

        <q-input
          v-model="itemPrice"
          type="text"
          inputmode="decimal"
          label="Valor unitario"
          style="width: 150px"
          @input="onRowPriceInput({ unit_price: itemPrice, isNew: true })"
        />

        <q-btn
          label="Añadir a cotización"
          color="primary"
          @click="addQuotationItem"
        />
      </q-card-section>

      <q-card-section>
        <q-checkbox
          v-model="applyTaxes"
          label="Incluir IVA (12%)"
        />
      </q-card-section>
    </q-card>

    <q-table
      class="q-mt-lg"
      :rows="quotationItems"
      :columns="columns"
      row-key="id"
      flat
      bordered
    >
      <template v-slot:body-cell-quantity="props">
        <q-input
          v-model.number="props.row.quantity"
          type="number"
          dense
          @input="updateRow(props.row)"
        />
      </template>
      <template v-slot:body-cell-unit_price="props">
        <q-input
          v-model="props.row.unit_price"
          type="text"
          dense
          inputmode="decimal"
          @input="onRowPriceInput(props.row)"
        />
      </template>
      <template v-slot:body-cell-description="props">
        <q-input
          v-model="props.row.description"
          dense
          @input="updateRow(props.row)"
        />
      </template>
      <template v-slot:body-cell-total="props">
        {{ (props.row.quantity * parseFloat(props.row.unit_price || 0)).toFixed(2) }}
      </template>
      <template v-slot:bottom>
        <q-tr>
          <q-td colspan="4" class="text-right">Total cotización</q-td>
          <q-td>{{ quotationTotal.toFixed(2) }}</q-td>
        </q-tr>
      </template>
    </q-table>

    <!-- Diálogo para crear/editar producto -->
    <q-dialog
      v-model="showProductDialog"
      persistent
      maximized
    >
      <q-card style="min-width: 500px; max-width: 90vw;">
        <q-card-section class="row justify-between items-center">
          <div class="text-h6">Crear / Editar producto</div>
          <q-btn icon="close" flat round dense @click="cancelNewProduct" />
        </q-card-section>

        <q-separator />

        <q-card-section>
          <product-form
            @added="onProductSaved"
            @saved="onProductSaved"
          />
        </q-card-section>
      </q-card>
    </q-dialog>
  </q-page>
</template>

<script>
import ClientForm from 'components/ClientForm.vue'
import ProductForm from 'components/ProductForm.vue'
import dbService from 'src/services/db'

export default {
  name: 'IndexPage',
  components: { ClientForm, ProductForm },
  data() {
    return {
      productOptions: [],
      selectedProdId: null,
      itemQuantity: 1,
      itemPrice: '',
      quotationItems: [],
      applyTaxes: false,
      showProductDialog: false,
      columns: [
        { name: 'unit',       label: 'Unidad',        field: 'unit' },
        { name: 'description',label: 'Descripción',   field: 'description' },
        { name: 'quantity',   label: 'Cantidad',      field: 'quantity' },
        { name: 'unit_price', label: 'Valor unitario',field: 'unit_price' },
        { name: 'total',      label: 'Valor total',   field: 'total' }
      ]
    }
  },
  computed: {
    quotationTotal() {
      const sum = this.quotationItems.reduce((acc, row) => {
        const val = row.quantity * parseFloat(row.unit_price || 0)
        return acc + val
      }, 0)
      return this.applyTaxes ? sum * 1.12 : sum
    }
  },
  created() {
    dbService.initDatabase().then(this.loadProductOptions)
  },
  methods: {
    loadProductOptions() {
      console.log('Cargando productos')
      const res = dbService.db.exec(`
        SELECT id, common_name, unit, description, price
        FROM products
      `)
      this.productOptions = [{ id: 0, common_name: 'Nuevo producto' }]
      if (res[0]) {
        res[0].values.forEach(([id, common_name, unit, description, price]) => {
          this.productOptions.push({
            id,
            common_name,
            unit,
            description,
            price: parseFloat(price).toFixed(2)
          })
        })
      }
      console.log('Opciones de producto:', this.productOptions)
    },
    onSelectProduct(val) {
      this.selectedProdId = val
      if (val === 0) {
        this.showProductDialog = true
      } else {
        this.showProductDialog = false
        const prod = this.productOptions.find(p => p.id === val)
        this.itemQuantity = 1
        this.itemPrice = prod ? prod.price : ''
      }
    },
    onQuantityInput(val) {
      this.itemQuantity = val
      console.log('Cantidad establecida', val)
    },
    onRowPriceInput(row) {
      row.unit_price = (row.unit_price || '').replace(/[^0-9.]/g, '')
      console.log('Valor unitario actualizado', row.unit_price)
    },
    addQuotationItem() {
      if (this.selectedProdId > 0) {
        const prod = this.productOptions.find(p => p.id === this.selectedProdId)
        const item = {
          id: Date.now(),
          unit: prod.unit,
          description: prod.description,
          quantity: this.itemQuantity,
          unit_price: this.itemPrice
        }
        this.quotationItems.push(item)
        console.log('Ítem añadido', item)
      }
    },
    updateRow(row) {
      console.log('Fila editada', row)
    },
    onProductSaved() {
      console.log('Producto guardado, recargando lista')
      this.showProductDialog = false
      this.selectedProdId = null
      this.loadProductOptions()
    },
    cancelNewProduct() {
      console.log('Creación de producto cancelada')
      this.showProductDialog = false
      this.selectedProdId = null
    }
  }
}
</script>
