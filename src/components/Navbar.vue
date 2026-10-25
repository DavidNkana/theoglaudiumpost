<script setup>

</script>

<template>
  <nav class="navbar navbar-expand-lg navbar-light">
    <div class="container-fluid">
<!--      <a class="navbar-brand" href="#"></a>-->
<!--      <button-->
<!--          class="navbar-toggler navbar-burger"-->
<!--          type="button"-->
<!--          @click="toggleSidebar"-->
<!--          :aria-expanded="$sidebar.showSidebar"-->
<!--          aria-label="Toggle navigation"-->
<!--      >-->
<!--        <span class="navbar-toggler-bar"></span>-->
<!--        <span class="navbar-toggler-bar"></span>-->
<!--        <span class="navbar-toggler-bar"></span>-->
<!--      </button>-->
      <div class="collapse navbar-collapse">
        <ul class="navbar-nav ml-auto">
          <li class="nav-item">
            <a href="#" class="nav-link">
              <i class="ti-panel"></i>
              <p>Stats</p>
            </a>
          </li>
          <drop-down
              class="nav-item"
              title="5 Notifications"
              title-classes="nav-link"
              icon="ti-bell"
          >
            <a class="dropdown-item" href="#">Notification 1</a>
            <a class="dropdown-item" href="#">Notification 2</a>
            <a class="dropdown-item" href="#">Notification 3</a>
            <a class="dropdown-item" href="#">Notification 4</a>
            <a class="dropdown-item" href="#">Another notification</a>
          </drop-down>
          <li class="nav-item">
            <a href="#" class="nav-link">
              <i class="ti-settings"></i>
              <p>Settings</p>
            </a>
          </li>
        </ul>
      </div>
    </div>
  </nav>
</template>

<style scoped>

</style>