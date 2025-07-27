<!-- src/components/ProductForm.vue -->
<template>
    <div class="q-pa-md">
        <q-card flat bordered>
            <q-card-section>
                <q-select v-model="selectedProductId" :options="products" option-value="id" option-label="common_name"
                    label="Selecciona producto o crea uno nuevo" emit-value map-options />
                <q-input v-model="form.common_name" label="Nombre común" :disable="fieldsDisabled" />
                <q-input v-model="form.product_code" label="Código de producto" :disable="fieldsDisabled" />
                <q-input v-model="form.description" label="Descripción" :disable="fieldsDisabled" />
                <q-input v-model="form.price" label="Precio" type="text" inputmode="decimal" maxlength="15"
                    :disable="fieldsDisabled" @input="onPriceInput" @blur="formatPrice" />
                <q-select v-model="form.unit" :options="unitOptions" option-value="value" option-label="label"
                    label="Unidad" :disable="fieldsDisabled" />
                <q-input v-model="form.materials" label="Materiales" type="textarea" :disable="fieldsDisabled" />
            </q-card-section>

            <q-card-actions align="right">
                <q-btn :label="buttonLabel" @click="onAction" color="primary" />
                <q-btn v-if="selectedProductId > 0" label="Cancelar" flat @click="resetSelection" />
            </q-card-actions>
        </q-card>
    </div>
</template>

<script>
import dbService from 'src/services/db'

export default {
    name: 'ProductForm',
    data() {
        return {
            products: [],
            selectedProductId: null,
            form: {
                common_name: '',
                product_code: '',
                description: '',
                price: '',
                unit: '',
                materials: ''
            },
            isEditing: false,
            unitOptions: [
                { value: 'u', label: 'unidad' },
                { value: 'm2', label: 'metros cuadrados' },
                { value: 'm3', label: 'metros cúbicos' },
                { value: 'ml', label: 'metros lineales' }
            ]
        }
    },
    computed: {
        fieldsDisabled() {
            return this.selectedProductId > 0
                ? !this.isEditing
                : false
        },
        buttonLabel() {
            return this.selectedProductId > 0
                ? (this.isEditing ? 'Guardar cambios' : 'Editar')
                : 'Añadir'
        }
    },
    watch: {
        selectedProductId() {
            this.onProductChange()
        }
    },
    created() {
        dbService.initDatabase().then(this.loadProducts)
    },
    methods: {

        onSelectProduct(val) {
            this.selectedProdId = val
            if (val === 0) {
                this.showProductDialog = true
                this.$nextTick(() => {
                    this.$refs.prodForm.resetSelection()
                })
            } else {
                this.showProductDialog = false
                const prod = this.productOptions.find(p => p.id === val)
                this.itemQuantity = 1
                this.itemPrice = prod.price
            }
        },
        loadProducts() {
            console.log('Cargando productos')
            const res = dbService.db.exec(`
        SELECT id, common_name
        FROM products
      `)
            const list = (res[0]?.values || []).map(
                ([id, common_name]) => ({ id, common_name })
            )
            this.products = [{ id: 0, common_name: 'Nuevo producto' }, ...list]
            console.log('Productos:', this.products)
        },
        onProductChange() {
            console.log('Producto seleccionado:', this.selectedProductId)
            if (this.selectedProductId > 0) {
                const stmt = dbService.db.prepare(`
          SELECT common_name, product_code, description, price, unit, materials
          FROM products
          WHERE id = ?
        `)
                stmt.bind([this.selectedProductId])
                if (stmt.step()) {
                    this.form = stmt.getAsObject()
                    this.form.price = parseFloat(this.form.price).toFixed(2)
                    console.log('Datos producto:', this.form)
                }
                stmt.free()
                this.isEditing = false
            } else {
                this.resetForm()
                this.isEditing = true
            }
        },
        onPriceInput(val) {
            let cleaned = (val || '').replace(/[^0-9.]/g, '')
            const parts = cleaned.split('.')
            if (parts.length > 1) {
                cleaned = parts[0] + '.' + parts.slice(1).join('')
            }
            const [intPart, decPart = ''] = cleaned.split('.')
            this.form.price = decPart.length > 0
                ? `${intPart}.${decPart.slice(0, 2)}`
                : intPart
            console.log('Precio raw:', this.form.price)
        },
        formatPrice() {
            const num = parseFloat(this.form.price)
            this.form.price = isNaN(num)
                ? ''
                : num.toFixed(2)
            console.log('Precio formateado:', this.form.price)
        },
        onAction() {
            if (this.selectedProductId > 0) {
                this.isEditing ? this.saveProduct() : this.isEditing = true
            } else {
                this.addProduct()
            }
        },
        addProduct() {
            console.log('Añadiendo producto', this.form)
            dbService.db.run(
                'INSERT INTO products (common_name, product_code, description, price, unit, materials) VALUES (?, ?, ?, ?, ?, ?)',
                [
                    this.form.common_name,
                    this.form.product_code,
                    this.form.description,
                    parseFloat(this.form.price) || 0,
                    this.form.unit,
                    this.form.materials
                ]
            )
            const res = dbService.db.exec('SELECT last_insert_rowid()')
            const newId = res[0].values[0][0]
            console.log('Producto añadido con ID', newId)
            this.loadProducts()
            this.selectedProductId = newId
            this.isEditing = false
            this.$emit('added')          // ← emito el evento aquí
        },
        saveProduct() {
            console.log('Guardando cambios producto', this.selectedProductId, this.form)
            dbService.db.run(
                'UPDATE products SET common_name = ?, product_code = ?, description = ?, price = ?, unit = ?, materials = ? WHERE id = ?',
                [
                    this.form.common_name,
                    this.form.product_code,
                    this.form.description,
                    parseFloat(this.form.price) || 0,
                    this.form.unit,
                    this.form.materials,
                    this.selectedProductId
                ]
            )
            console.log('Producto actualizado')
            this.loadProducts()
            this.isEditing = false
            this.$emit('saved')          // ← y también aquí
        },
        resetSelection() {
            console.log('Cancelando edición producto')
            this.selectedProductId = 0
            this.resetForm()
            this.isEditing = true
        },
        resetForm() {
            this.form = {
                common_name: '',
                product_code: '',
                description: '',
                price: '',
                unit: '',
                materials: ''
            }
        }
    }
}
</script>
