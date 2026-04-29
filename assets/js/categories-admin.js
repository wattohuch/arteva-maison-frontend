/**
 * Categories Management Module
 * Admin interface for managing product categories
 */

let allCategories = [];
let editingCategoryId = null;

// Initialize categories management
function initCategoriesManagement() {
    loadCategoriesAdmin();
    initCategoryForm();
}

// Load categories for admin
async function loadCategoriesAdmin() {
    try {
        const response = await CategoriesAPI.getAll();
        if (response.success) {
            allCategories = response.data;
            renderCategoriesTable(allCategories);
        }
    } catch (error) {
        console.error('Failed to load categories:', error);
        showToast('Error', 'Failed to load categories', 'error');
    }
}

// Render categories table
function renderCategoriesTable(categories) {
    const tbody = document.getElementById('categoriesTableBody');
    if (!tbody) return;

    if (categories.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align: center; padding: 48px;">
                    <div style="color: var(--admin-text-muted);">
                        <div style="font-size: 36px; margin-bottom: 12px; opacity: 0.4;">📁</div>
                        <p>No categories found</p>
                        <p style="font-size: 12px; margin-top: 4px;">Click "Add Category" to create one</p>
                    </div>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = categories.map(cat => {
        // Resolve image URL: absolute URLs pass through, relative paths resolve to backend
        const backendOrigin = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '').replace('/api', '');
        const imgSrc = cat.image
            ? (cat.image.startsWith('http') ? cat.image : backendOrigin + cat.image)
            : 'assets/images/products/placeholder.png';
        return `
        <tr>
            <td>
                <img 
                    src="${imgSrc}" 
                    class="product-thumb" 
                    alt="${cat.name}"
                    onerror="this.src='assets/images/products/placeholder.png'"
                >
            </td>
            <td><strong>${cat.name}</strong></td>
            <td>${cat.nameAr || '-'}</td>
            <td><span id="cat-products-${cat._id}">Loading...</span></td>
            <td onclick="event.stopPropagation()">
                <button class="admin-btn-icon" onclick="editCategory('${cat._id}')" title="Edit">✏️</button>
                <button class="admin-btn-icon delete" onclick="deleteCategory('${cat._id}')" title="Delete">🗑️</button>
            </td>
        </tr>
    `}).join('');

    // Load product counts
    categories.forEach(cat => {
        loadCategoryProductCount(cat._id);
    });
}

// Load product count for category
async function loadCategoryProductCount(categoryId) {
    try {
        const response = await fetch(`${API_BASE_URL}/categories/${categoryId}/stats`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('arteva_token')}`
            }
        });
        const data = await response.json();

        if (data.success) {
            const countEl = document.getElementById(`cat-products-${categoryId}`);
            if (countEl) {
                countEl.textContent = data.data.productsCount;
            }
        }
    } catch (error) {
        console.error('Failed to load product count:', error);
    }
}

// Initialize category form
function initCategoryForm() {
    const form = document.getElementById('categoryForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        await saveCategoryForm();
    });
}

// Open add category modal
window.openAddCategoryModal = function () {
    editingCategoryId = null;
    const form = document.getElementById('categoryForm');
    if (form) form.reset();

    document.getElementById('categoryModalTitle').textContent = 'Add New Category';
    document.getElementById('categoryId').value = '';

    // Use the correct ID: existingCategoryImage
    const existingImg = document.getElementById('existingCategoryImage');
    if (existingImg) {
        existingImg.innerHTML = '';
        existingImg.style.display = 'none';
    }

    // Hide preview
    const preview = document.getElementById('categoryImagePreview');
    if (preview) preview.style.display = 'none';

    const modal = document.getElementById('categoryModal');
    if (modal) modal.classList.remove('hidden');
};

// Close category modal
window.closeCategoryModal = function () {
    const modal = document.getElementById('categoryModal');
    if (modal) modal.classList.add('hidden');
    editingCategoryId = null;
};

// Edit category — fixed to use correct form field selectors
window.editCategory = async function (categoryId) {
    try {
        const response = await CategoriesAPI.getById(categoryId);
        if (response.success) {
            const cat = response.data;
            editingCategoryId = categoryId;

            document.getElementById('categoryModalTitle').textContent = 'Edit Category';
            document.getElementById('categoryId').value = cat._id;

            // Use form.querySelector with name attributes (matching admin.html form)
            const form = document.getElementById('categoryForm');
            const nameField = form.querySelector('[name="name"]');
            const nameArField = form.querySelector('[name="nameAr"]');
            const descField = form.querySelector('[name="description"]');

            if (nameField) nameField.value = cat.name || '';
            if (nameArField) nameArField.value = cat.nameAr || '';
            if (descField) descField.value = cat.description || '';

            // Handle isActive checkbox
            const isActiveField = form.querySelector('[name="isActive"]');
            if (isActiveField) isActiveField.checked = cat.isActive !== false;

            // Show current image — use the correct ID: existingCategoryImage
            const currentImageDiv = document.getElementById('existingCategoryImage');
            if (cat.image) {
                const backendOrigin = (typeof API_BASE_URL !== 'undefined' ? API_BASE_URL : '').replace('/api', '');
                const editImgSrc = cat.image.startsWith('http') ? cat.image : backendOrigin + cat.image;
                currentImageDiv.innerHTML = `
                    <label>Current Image:</label>
                    <img src="${editImgSrc}" alt="${cat.name}" style="max-width: 200px; border-radius: 8px;">
                `;
                currentImageDiv.style.display = 'block';
            } else {
                currentImageDiv.innerHTML = '';
                currentImageDiv.style.display = 'none';
            }

            const modal = document.getElementById('categoryModal');
            if (modal) modal.classList.remove('hidden');
        }
    } catch (error) {
        console.error('Failed to load category:', error);
        showToast('Error', 'Failed to load category', 'error');
    }
};

// Save category form — with loading spinner
async function saveCategoryForm() {
    const form = document.getElementById('categoryForm');
    const formData = new FormData(form);
    const categoryId = document.getElementById('categoryId').value;

    // Get the submit button and show loading state
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : 'Save Category';

    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.classList.add('admin-btn-loading');
        submitBtn.innerHTML = '<span class="admin-spinner"></span> Saving…';
    }

    try {
        let response;
        if (categoryId) {
            // Update existing category
            response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('arteva_token')}`
                },
                body: formData
            });
        } else {
            // Create new category
            response = await fetch(`${API_BASE_URL}/categories`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('arteva_token')}`
                },
                body: formData
            });
        }

        const data = await response.json();

        if (data.success) {
            showToast('Success', categoryId ? 'Category updated' : 'Category created', 'success');
            closeCategoryModal();
            loadCategoriesAdmin();
        } else {
            showToast('Error', data.message || 'Operation failed', 'error');
        }
    } catch (error) {
        console.error('Failed to save category:', error);
        showToast('Error', 'Failed to save category', 'error');
    } finally {
        // Restore button state
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.classList.remove('admin-btn-loading');
            submitBtn.textContent = originalText;
        }
    }
}

// Delete category — with loading state
window.deleteCategory = async function (categoryId) {
    // Get product count first
    try {
        const statsResponse = await fetch(`${API_BASE_URL}/categories/${categoryId}/stats`, {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('arteva_token')}`
            }
        });
        const statsData = await statsResponse.json();

        if (statsData.success && statsData.data.productsCount > 0) {
            showToast('Error', `Cannot delete category. ${statsData.data.productsCount} product(s) are linked to this category.`, 'error');
            return;
        }

        if (!confirm('Are you sure you want to delete this category?')) {
            return;
        }

        // Find and disable the delete button
        const deleteBtn = document.querySelector(`button[onclick="deleteCategory('${categoryId}')"]`);
        if (deleteBtn) {
            deleteBtn.disabled = true;
            deleteBtn.textContent = '⏳';
        }

        const response = await fetch(`${API_BASE_URL}/categories/${categoryId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('arteva_token')}`
            }
        });

        const data = await response.json();

        if (data.success) {
            showToast('Success', 'Category deleted', 'success');
            loadCategoriesAdmin();
        } else {
            showToast('Error', data.message || 'Failed to delete category', 'error');
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.textContent = '🗑️';
            }
        }
    } catch (error) {
        console.error('Failed to delete category:', error);
        showToast('Error', 'Failed to delete category', 'error');
    }
};

// Export for use in admin.js
window.initCategoriesManagement = initCategoriesManagement;
window.loadCategoriesAdmin = loadCategoriesAdmin;
