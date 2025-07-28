<template>
    <div class="q-pa-md">
        <q-card flat bordered>

            <q-card-section class="row items-center q-col-gutter-md">
                <q-select v-model="selectedProductId" :options="products" option-value="id" option-label="common_name"
                    label="Selecciona producto" emit-value map-options @update:model-value="onProductChange"
                    style="width: 250px" />
                <q-select v-model="productType" :options="typeOptions" option-value="value" option-label="label"
                    emit-value map-options label="Tipo" :disable="selectedProductId > 0" style="width: 200px" />
                <q-input v-model="form.product_code" label="Código" readonly style="width: 160px" />
            </q-card-section>

            <q-card-section>
                <q-input v-model="form.common_name" label="Nombre común" :disable="fieldsDisabled" />
                <q-input v-model="form.description" label="Descripción" :disable="fieldsDisabled" />
                <q-input v-model="form.price" label="Precio" type="text" inputmode="decimal" maxlength="15"
                    :disable="fieldsDisabled" @input="onPriceInput" @blur="formatPrice" />
                <q-select v-model="form.unit" :options="unitOptions" option-value="value" option-label="label"
                    emit-value map-options label="Unidad" :disable="fieldsDisabled" />
            </q-card-section>

            <q-card-section>
                <div class="text-subtitle1">Materiales</div>
                <q-table :rows="materialOptions" row-key="id" flat dense class="q-mt-sm">
                    <template v-slot:header>
                        <q-tr>
                            <q-th style="width: 60px">Incl.</q-th>
                            <q-th>Nombre</q-th>
                            <q-th>Descripción</q-th>
                        </q-tr>
                    </template>
                    <template v-slot:body="props">
                        <q-tr :props="props">
                            <q-td>
                                <q-checkbox :model-value="selectedMaterials.includes(props.row.id)"
                                    @update:model-value="val => onMaterialCheck(props.row.id, val)"
                                    :disable="fieldsDisabled" />
                            </q-td>
                            <q-td>
                                <q-input dense v-model="props.row.name" :disable="fieldsDisabled"
                                    @blur="onMaterialFieldBlur(props.row, 'name')" />
                            </q-td>
                            <q-td>
                                <q-input dense v-model="props.row.description" :disable="fieldsDisabled"
                                    @blur="onMaterialFieldBlur(props.row, 'description')" />
                            </q-td>
                        </q-tr>
                    </template>
                </q-table>
                <q-btn label="Nuevo material" icon="add" flat class="q-mt-sm" @click="showMaterialDialog = true"
                    :disable="fieldsDisabled" />
            </q-card-section>

            <q-card-actions align="right">
                <q-btn :label="buttonLabel" color="primary" @click="onAction" />
                <q-btn v-if="selectedProductId > 0" flat label="Cancelar" @click="resetSelection" />
            </q-card-actions>
        </q-card>

        <!-- confirmación con QDialog persistente -->
        <q-dialog v-model="confirmDialog.show" persistent transition-show="scale" transition-hide="scale">
            <q-card style="min-width: 300px">
                <q-card-section class="text-h6">
                    {{ confirmDialog.message }}
                </q-card-section>
                <q-card-actions align="right">
                    <q-btn flat label="APLICAR" @click="confirmMaterialChange" />
                    <q-btn flat label="CANCELAR" v-close-popup />
                </q-card-actions>
            </q-card>
        </q-dialog>

        <q-dialog v-model="showMaterialDialog">
            <q-card>
                <q-card-section>
                    <material-form @added="onMaterialAdded" @saved="onMaterialAdded" />
                </q-card-section>
                <q-card-actions align="right">
                    <q-btn flat label="Cerrar" @click="showMaterialDialog = false" />
                </q-card-actions>
            </q-card>
        </q-dialog>
    </div>
</template>

<script>
import dbService from 'src/services/db'
import MaterialForm from './MaterialForm.vue'

export default {
    name: 'ProductForm',
    components: { MaterialForm },
    data() {
        return {
            products: [],
            selectedProductId: 0,
            productType: 'P',
            form: { common_name: '', product_code: '', description: '', price: '', unit: '' },
            selectedMaterials: [],
            materialOptions: [],
            originalMaterials: [],
            confirmDialog: { show: false, rowId: null, field: '', oldValue: '', newValue: '', message: '' },
            isEditing: false,
            showMaterialDialog: false,
            unitOptions: [
                { value: 'u', label: 'unidad' },
                { value: 'm2', label: 'metros cuadrados' },
                { value: 'm3', label: 'metros cúbicos' },
                { value: 'ml', label: 'metros lineales' }
            ],
            typeOptions: [
                { value: 'P', label: 'Producto (P)' },
                { value: 'S', label: 'Servicio (S)' },
                { value: 'M', label: 'Mano de Obra (M)' }
            ]
        }
    },
    watch: {
        productType(newType) {
            if (this.selectedProductId === 0) {
                this.form.product_code = dbService.nextProductCode(newType)
            }
        }
    },
    computed: {
        fieldsDisabled() {
            return this.selectedProductId > 0 ? !this.isEditing : false
        },
        buttonLabel() {
            return this.selectedProductId > 0
                ? (this.isEditing ? 'Guardar cambios' : 'Editar')
                : 'Añadir'
        }
    },
    methods: {
        loadProducts() {
            const res = dbService.db.exec('SELECT id, common_name FROM products')
            this.products = [{ id: 0, common_name: 'Nuevo producto' }]
            res[0]?.values.forEach(([id, cn]) => this.products.push({ id, common_name: cn }))
        },
        loadMaterialOptions() {
            const mats = dbService.loadMaterials()
            this.originalMaterials = mats.map(m => ({ ...m }))
            this.materialOptions = mats.map(m => ({ ...m }))
        },
        onMaterialAdded() {
            this.loadMaterialOptions()
            this.showMaterialDialog = false
        },
        onMaterialCheck(id, checked) {
            const i = this.selectedMaterials.indexOf(id)
            if (checked && i === -1) this.selectedMaterials.push(id)
            else if (!checked && i !== -1) this.selectedMaterials.splice(i, 1)
            dbService.saveProductMaterials(this.selectedProductId, this.selectedMaterials)
        },
        onMaterialFieldBlur(row, field) {
            const orig = this.originalMaterials.find(o => o.id === row.id)
            if (!orig || orig[field] === row[field]) return
            this.confirmDialog = {
                show: true,
                rowId: row.id,
                field,
                oldValue: orig[field],
                newValue: row[field],
                message: `Cambiar ${field === 'name' ? 'Nombre' : 'Descripción'} de "${orig[field]}" a "${row[field]}"?`
            }
        },
        confirmMaterialChange() {
            const { rowId, field, newValue } = this.confirmDialog
            this.confirmDialog.show = false
            const mat = this.materialOptions.find(m => m.id === rowId)
            dbService.updateMaterial(rowId, mat.name, mat.description)
            const orig = this.originalMaterials.find(o => o.id === rowId)
            orig[field] = newValue
        },
        onProductChange(id) {
            if (id > 0) {
                const stmt = dbService.db.prepare(`
          SELECT common_name, product_code, description, price, unit
          FROM products WHERE id = ?
        `)
                stmt.bind([id])
                if (stmt.step()) this.form = stmt.getAsObject()
                stmt.free()
                this.productType = this.form.product_code.charAt(0)
                this.selectedMaterials = dbService.loadProductMaterials(id)
                this.isEditing = false
            }
            else {
                this.form = {
                    common_name: '',
                    product_code: dbService.nextProductCode(this.productType),
                    description: '',
                    price: '',
                    unit: ''
                }
                this.selectedMaterials = []
                this.isEditing = true
            }
            this.loadProducts()
            this.loadMaterialOptions()
        },
        onPriceInput(val) {
            let c = (val || '').replace(/[^0-9.]/g, '')
            const parts = c.split('.')
            if (parts.length > 1) c = parts[0] + '.' + parts.slice(1).join('')
            const [i, d = ''] = c.split('.')
            this.form.price = d ? `${i}.${d.slice(0, 2)}` : i
        },
        formatPrice() {
            const n = parseFloat(this.form.price)
            this.form.price = isNaN(n) ? '' : n.toFixed(2)
        },
        async onAction() {
            if (this.selectedProductId > 0) {
                if (this.isEditing) await this.saveProduct()
                else this.isEditing = true
            } else {
                await this.addProduct()
            }
        },
        async addProduct() {
            dbService.db.run(
                `INSERT INTO products (common_name, product_code, description, price, unit)
         VALUES (?, ?, ?, ?, ?)`,
                [this.form.common_name, this.form.product_code, this.form.description,
                parseFloat(this.form.price) || 0, this.form.unit]
            )
            const newId = dbService.db.exec('SELECT last_insert_rowid()')[0].values[0][0]
            await dbService.saveProductMaterials(newId, this.selectedMaterials)
            await dbService.save()
            this.selectedProductId = newId
            this.isEditing = false
            this.$emit('added')
        },
        async saveProduct() {
            dbService.db.run(
                `UPDATE products
          SET common_name=?, product_code=?, description=?, price=?, unit=?
         WHERE id=?`,
                [this.form.common_name, this.form.product_code, this.form.description,
                parseFloat(this.form.price) || 0, this.form.unit, this.selectedProductId]
            )
            await dbService.saveProductMaterials(this.selectedProductId, this.selectedMaterials)
            await dbService.save()
            this.isEditing = false
            this.$emit('saved')
        },
        resetSelection() {
            this.selectedProductId = 0
            this.onProductChange(0)
        }
    },
    mounted() {
        this.loadProducts()
        this.loadMaterialOptions()
    }
}
</script>
