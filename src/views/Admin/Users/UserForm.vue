<script setup>
import { createUser, editUser } from "@/features/users/UsersService";
import { ref, computed, watch } from "vue";

const props = defineProps({
  user: {
    type: Object,
    default: null,
  },
  roles: {
    type: Array,
    default: () => [],
  },
});

const emits = defineEmits(["close", "add-user", "update-user"]);

const isEdit = computed(() => props.user != null);
const isSubmitting = ref(false);
const form = ref({ name: "", email: "", password: "", roleId: null });

watch(
  () => props.user,
  (u) => {
    if (u) {
      form.value = {
        name: u.name ?? "",
        email: u.email ?? "",
        password: "",
        roleId: u.roleId ?? null,
      };
    } else {
      form.value = { name: "", email: "", password: "", roleId: null };
    }
  },
  { immediate: true }
);

const saveUser = async () => {
  isSubmitting.value = true;
  try {
    if (isEdit.value) {
      const { data } = await editUser(props.user.id, { ...form.value });
      emits("update-user", data);
    } else {
      const { data } = await createUser({ ...form.value });
      emits("add-user", data);
    }
    emits("close");
  } catch (e) {
    console.error("Failed to save user", e);
    alert("There was an error saving the user.");
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<template>
  <form @submit.prevent="saveUser" class="card card-body">
    <div class="modal-header mb-4 p-2">
      <h3 class="">
        {{ isEdit ? "Edit User" : "Create New User" }}
      </h3>
      <button
        v-if="!isSubmitting"
        type="button"
        class="btn-close"
        @click="emits('close')"
      ></button>
    </div>

    <div class="mb-3">
      <label for="name" class="form-label">Name</label>
      <div class="input-group">
        <span class="input-group-text bg-light">
          <i class="bi bi-person"></i>
        </span>
        <input
          type="text"
          class="form-control"
          id="name"
          v-model="form.name"
          placeholder="Enter Name"
          required
        />
      </div>
    </div>

    <div class="mb-3">
      <label for="email" class="form-label">Email address</label>
      <div class="input-group">
        <span class="input-group-text bg-light">
          <i class="bi bi-envelope"></i>
        </span>
        <input
          type="email"
          class="form-control"
          id="email"
          v-model="form.email"
          placeholder="Enter Email"
          required
        />
      </div>
    </div>

    <div class="mb-3">
      <label for="password" class="form-label">
        {{ isEdit ? "New Password (leave blank to keep)" : "Password" }}
      </label>
      <div class="input-group">
        <span class="input-group-text bg-light">
          <i class="bi bi-lock"></i>
        </span>
        <input
          type="password"
          class="form-control"
          id="password"
          v-model="form.password"
          placeholder="Enter Password"
          :required="!isEdit"
        />
      </div>
    </div>

    <div class="mb-3">
      <label for="roleId" class="form-label">Role</label>
      <select class="form-select" id="roleId" v-model="form.roleId">
        <option v-for="r in roles" :key="r.id" :value="r.id">
          {{ r.name }}
        </option>
      </select>
    </div>

    <div class="d-flex justify-content-between modal-footer p-0 pt-2">
      <button
        type="button"
        class="btn btn-outline-secondary me-2"
        @click="emits('close')"
      >
        Cancel
      </button>

      <button class="btn btn-success" :disabled="isSubmitting">
        <span
          v-if="isSubmitting"
          class="spinner-border spinner-border-sm me-2"
          role="status"
          aria-hidden="true"
        ></span>
        <span v-else> {{ isEdit ? "Update" : "Create" }}</span>
      </button>
    </div>
  </form>
</template>
