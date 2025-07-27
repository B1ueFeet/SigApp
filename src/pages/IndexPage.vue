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
          style="width: 80px"
        />

        <q-input
          v-model="itemPrice"
          type="text"
          inputmode="decimal"
          label="Valor unitario"
          style="width: 100px"
          @input="onRowPriceInput({ unit_price: itemPrice })"
        />

        <q-btn
          label="Añadir a cotización"
          color="primary"
          @click="addQuotationItem"
        />
      </q-card-section>

      <q-card-section class="row items-center q-gutter-sm">
        <q-checkbox v-model="applyTaxes" label="Incluir IVA (12%)" />
        <q-input
          v-model.number="discountAmount"
          type="number"
          label="Descuento"
          style="width: 100px"
          min="0"
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
      dense
    >
      <template v-slot:body="props">
        <q-tr :props="props">
          <q-td auto-width>{{ props.row.unit }}</q-td>
          <q-td>
            <q-input
              dense
              v-model="props.row.description"
              @input="updateRow(props.row)"
              style="width: 100%;"
            />
          </q-td>
          <q-td auto-width>
            <q-input
              dense
              type="number"
              v-model.number="props.row.quantity"
              @input="updateRow(props.row)"
              style="width: 80px;"
            />
          </q-td>
          <q-td auto-width>
            <q-input
              dense
              inputmode="decimal"
              v-model="props.row.unit_price"
              @input="onRowPriceInput(props.row)"
              style="width: 100px;"
            />
          </q-td>
          <q-td auto-width class="text-right">
            {{ (props.row.quantity * parseFloat(props.row.unit_price || 0)).toFixed(2) }}
          </q-td>
        </q-tr>
      </template>

      <template v-slot:bottom>
        <q-tr>
          <q-td colspan="4" class="text-right">Subtotal</q-td>
          <q-td class="text-right">{{ subtotal.toFixed(2) }}</q-td>
        </q-tr>
        <q-tr>
          <q-td colspan="4" class="text-right">IVA (12%)</q-td>
          <q-td class="text-right">{{ ivaAmount.toFixed(2) }}</q-td>
        </q-tr>
        <q-tr>
          <q-td colspan="4" class="text-right">Descuento</q-td>
          <q-td class="text-right">
            -{{ (Number(discountAmount) || 0).toFixed(2) }}
          </q-td>
        </q-tr>
        <q-tr>
          <q-td colspan="4" class="text-right"><strong>Total</strong></q-td>
          <q-td class="text-right"><strong>{{ totalAmount.toFixed(2) }}</strong></q-td>
        </q-tr>
      </template>
    </q-table>

    <q-dialog v-model="showProductDialog" persistent maximized>
      <q-card style="min-width: 500px; max-width: 90vw;">
        <q-card-section class="row justify-between items-center">
          <div class="text-h6">Crear / Editar producto</div>
          <q-btn icon="close" flat round dense @click="cancelNewProduct" />
        </q-card-section>
        <q-separator />
        <q-card-section>
          <product-form
            ref="prodForm"
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
      discountAmount: 0,
      showProductDialog: false,
      columns: [
        { name: 'unit',        label: 'Unidad',         field: 'unit' },
        { name: 'description', label: 'Descripción',    field: 'description' },
        { name: 'quantity',    label: 'Cantidad',       field: 'quantity' },
        { name: 'unit_price',  label: 'Valor unitario', field: 'unit_price' },
        { name: 'total',       label: 'Valor total',    field: 'total' }
      ]
    }
  },
  computed: {
    subtotal() {
      return this.quotationItems.reduce(
        (acc, row) => acc + row.quantity * parseFloat(row.unit_price || 0),
        0
      )
    },
    ivaAmount() {
      return this.applyTaxes ? this.subtotal * 0.12 : 0
    },
    totalAmount() {
      return this.subtotal + this.ivaAmount - (Number(this.discountAmount) || 0)
    }
  },
  created() {
    dbService.initDatabase().then(this.loadProductOptions)
  },
  methods: {
    loadProductOptions() {
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
    },
    onSelectProduct(val) {
      this.selectedProdId = val
      if (val === 0) {
        this.$nextTick(() => this.$refs.prodForm.resetSelection())
        this.showProductDialog = true
      } else {
        this.showProductDialog = false
        const prod = this.productOptions.find(p => p.id === val)
        this.itemQuantity = 1
        this.itemPrice = prod ? prod.price : ''
      }
    },
    onRowPriceInput(row) {
      row.unit_price = (row.unit_price || '').replace(/[^0-9.]/g, '')
    },
    addQuotationItem() {
      if (this.selectedProdId > 0) {
        const prod = this.productOptions.find(p => p.id === this.selectedProdId)
        this.quotationItems.push({
          id: Date.now(),
          unit: prod.unit,
          description: prod.description,
          quantity: this.itemQuantity,
          unit_price: this.itemPrice
        })
      }
    },
    updateRow(row) {},
    onProductSaved() {
      this.showProductDialog = false
      this.selectedProdId = null
      this.loadProductOptions()
    },
    cancelNewProduct() {
      this.showProductDialog = false
      this.selectedProdId = null
    }
  }
}
</script>
