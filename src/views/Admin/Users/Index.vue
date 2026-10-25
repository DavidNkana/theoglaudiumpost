<script setup>
import { ref, computed, watch, onMounted } from "vue";
import { getUsers, getRoles, removeUser } from "@/features/users/UsersService";
import UserForm from "./UserForm.vue";
import UsersTable from "./Partials/UsersTable.vue";
import { Modal } from "bootstrap";

const users = ref([]);
const roles = ref([]);
const loading = ref(false);
const loadError = ref("");
const search = ref("");
const currentPage = ref(1);
const pageSize = ref(10);
const selectedUser = ref(null);
const deleteId = ref(null);
const isDeleting = ref(false);
const formModalEl = ref(null);
const deleteModalEl = ref(null);
let formModal = null;
let deleteModal = null;

const fetchUsers = async () => {
  loading.value = true;
  loadError.value = "";
  try {
    const { data } = await getUsers();
    users.value = data ?? [];
  } catch (e) {
    loadError.value = "Failed to load users. Please try again.";
    console.error("Failed to load users", e);
  } finally {
    loading.value = false;
  }
};

const fetchRoles = async () => {
  try {
    const { data } = await getRoles();
    roles.value = data ?? [];
  } catch (e) {
    loadError.value = "Failed to load roles. Please try again.";
    console.error("Failed to load roles", e);
  }
};

const filteredUsers = computed(() => {
  const q = search.value.trim().toLowerCase();
  if (!q) return users.value;
  return users.value.filter(
    (u) =>
      (u.name ?? "").toLowerCase().includes(q) ||
      (u.email ?? "").toLowerCase().includes(q)
  );
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(filteredUsers.value.length / pageSize.value))
);

const pagedUsers = computed(() =>
  filteredUsers.value.slice(
    (currentPage.value - 1) * pageSize.value,
    currentPage.value * pageSize.value
  )
);

watch(search, () => {
  currentPage.value = 1;
});

const openCreateModal = () => {
  selectedUser.value = null;
  formModal.show();
};

const openEditModal = (id) => {
  selectedUser.value = users.value.find((u) => u.id === id) ?? null;
  formModal.show();
};

const closeForm = () => {
  formModal?.hide();
};

const addUser = (u) => {
  users.value.unshift(u);
};

const updateUser = (u) => {
  const i = users.value.findIndex((x) => x.id === u.id);
  if (i !== -1) users.value[i] = u;
};

const confirmDelete = (id) => {
  deleteId.value = id;
  deleteModal.show();
};

const deleteUser = async () => {
  isDeleting.value = true;
  try {
    await removeUser(deleteId.value);
    users.value = users.value.filter((u) => u.id !== deleteId.value);
    deleteModal?.hide();
  } catch (e) {
    loadError.value = "Failed to delete user. Please try again.";
    console.error("Failed to delete user", e);
  } finally {
    isDeleting.value = false;
  }
};

const changePage = (p) => {
  if (p >= 1 && p <= totalPages.value) currentPage.value = p;
};

const getPageNumbers = () => {
  const pages = [];
  const last = totalPages.value;
  let startPage = Math.max(1, currentPage.value - 2);
  let endPage = Math.min(last, startPage + 4);

  if (endPage - startPage < 4) {
    startPage = Math.max(1, endPage - 4);
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i);
  }

  return pages;
};

onMounted(() => {
  formModal = new Modal(formModalEl.value);
  deleteModal = new Modal(deleteModalEl.value);
  fetchUsers();
  fetchRoles();
});
</script>

<template>
  <div class="container-fluid py-4">
    <div class="row mb-4">
      <div class="col-12">
        <h2>Users</h2>
      </div>
    </div>

    <div class="row">
      <div class="col-12">
        <div class="card">
          <div class="card-body">
            <div class="mb-4">
              <div class="row align-items-center">
                <!-- Left-aligned search -->
                <div class="col-12 col-lg-auto mb-3 mb-lg-0">
                  <input
                    type="text"
                    v-model="search"
                    class="form-control"
                    placeholder="Search users..."
                  />
                </div>

                <!-- Right-aligned button -->
                <div class="col-lg ms-lg-auto text-end">
                  <button @click="openCreateModal" class="btn btn-success">
                    Create User
                  </button>
                </div>
              </div>
            </div>

            <!-- Real error state shown on load failure (no silent empty data) -->
            <div v-if="loadError" class="alert alert-danger" role="alert">
              {{ loadError }}
            </div>

            <!-- Users Table -->
            <UsersTable
              v-else
              :users="pagedUsers"
              :is-loading="loading"
              :page="currentPage - 1"
              :page-size="pageSize"
              :roles="roles"
              @handle-edit="openEditModal"
              @handle-delete="confirmDelete"
            />

            <!-- Pagination -->
            <nav
              aria-label="users pagination"
              class="d-sm-flex items-align-center justify-content-between mt-4 mt-md-0"
            >
              <ul class="pagination justify-content-center mt-2 mt-sm-0">
                <li class="page-item" :class="{ disabled: currentPage === 1 }">
                  <a
                    class="page-link"
                    href="#"
                    @click.prevent="changePage(currentPage - 1)"
                    >Previous</a
                  >
                </li>
                <li
                  v-for="page in getPageNumbers()"
                  :key="page"
                  class="page-item"
                  :class="{ active: page === currentPage }"
                >
                  <a
                    class="page-link"
                    href="#"
                    @click.prevent="changePage(page)"
                    >{{ page }}</a
                  >
                </li>
                <li
                  class="page-item"
                  :class="{ disabled: currentPage === totalPages }"
                >
                  <a
                    class="page-link"
                    href="#"
                    @click.prevent="changePage(currentPage + 1)"
                    >Next</a
                  >
                </li>
              </ul>
            </nav>
          </div>
        </div>
      </div>
    </div>

    <div class="modal fade" id="formModal" tabindex="-1" ref="formModalEl">
      <div class="modal-dialog modal-lg">
        <div class="modal-content">
          <div class="modal-body p-0">
            <UserForm
              :user="selectedUser"
              :roles="roles"
              @close="closeForm"
              @add-user="addUser"
              @update-user="updateUser"
            />
          </div>
        </div>
      </div>
    </div>

    <div
      class="modal fade"
      ref="deleteModalEl"
      id="deleteModal"
      tabindex="-1"
      aria-hidden="true"
    >
      <div class="modal-dialog">
        <div class="modal-content">
          <div class="modal-header bg-danger text-white">
            <h5 class="modal-title">Confirm Deletion</h5>
            <button
              type="button"
              class="btn-close"
              data-bs-dismiss="modal"
              aria-label="Close"
            ></button>
          </div>
          <div class="modal-body">
            <p>Are you sure you want to delete this user?</p>
            <p class="text-danger">
              <strong>Warning:</strong> This action cannot be undone.
            </p>
          </div>
          <div class="modal-footer">
            <button
              type="button"
              class="btn btn-secondary"
              data-bs-dismiss="modal"
            >
              Cancel
            </button>
            <button
              type="button"
              class="btn btn-danger"
              @click="deleteUser"
              :disabled="isDeleting"
            >
              <span
                v-if="isDeleting"
                class="spinner-border spinner-border-sm me-2"
                role="status"
                aria-hidden="true"
              ></span>
              {{ isDeleting ? "Deleting..." : "Delete User" }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
