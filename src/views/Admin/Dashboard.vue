<!-- 
  Admin dashboard page that contains:
  1. Statistics cards showing key metrics
  2. Recent activity feed with system events
  3. Quick draft form for creating new content
  4. Pending tasks list with priority indicators
-->
<template>
  <div class="admin-dashboard">
    <!-- Page title and actions -->
    <div class="d-flex justify-content-between align-items-center mb-4">
      <div>
        <h1 class="h3 mb-1">Dashboard</h1>
        <p class="text-muted">Welcome back, Admin User!</p>
      </div>
      <div>
        <button class="btn btn-primary">
          <i class="bi bi-plus-lg me-1"></i>
          Add New Post
        </button>
      </div>
    </div>

    <!-- Stats cards -->
    <div class="row g-3 mb-4">
      <div class="col-sm-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body d-flex align-items-center">
            <div
              class="icon-box bg-primary bg-opacity-10 text-primary rounded-3 me-3"
            >
              <i class="bi bi-newspaper fs-3"></i>
            </div>
            <div>
              <h6 class="mb-1">Total Posts</h6>
              <h3 class="mb-0">58</h3>
            </div>
          </div>
        </div>
      </div>

      <div class="col-sm-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body d-flex align-items-center">
            <div
              class="icon-box bg-success bg-opacity-10 text-success rounded-3 me-3"
            >
              <i class="bi bi-play-btn fs-3"></i>
            </div>
            <div>
              <h6 class="mb-1">Total Videos</h6>
              <h3 class="mb-0">24</h3>
            </div>
          </div>
        </div>
      </div>

      <div class="col-sm-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body d-flex align-items-center">
            <div
              class="icon-box bg-warning bg-opacity-10 text-warning rounded-3 me-3"
            >
              <i class="bi bi-shop fs-3"></i>
            </div>
            <div>
              <h6 class="mb-1">Businesses</h6>
              <h3 class="mb-0">42</h3>
            </div>
          </div>
        </div>
      </div>

      <div class="col-sm-6 col-lg-3">
        <div class="card border-0 shadow-sm h-100">
          <div class="card-body d-flex align-items-center">
            <div
              class="icon-box bg-info bg-opacity-10 text-info rounded-3 me-3"
            >
              <i class="bi bi-people fs-3"></i>
            </div>
            <div>
              <h6 class="mb-1">Total Users</h6>
              <h3 class="mb-0">1,254</h3>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="row g-4">
      <!-- Recent activity -->
      <div class="col-lg-8">
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white">
            <h5 class="card-title mb-0">Recent Articles</h5>
          </div>
          <div class="card-body p-0">
            <div class="list-group list-group-flush">
              <div class="list-group-item py-3">
                <div class="d-flex align-items-center">
                  <div
                    class="activity-icon bg-primary bg-opacity-10 text-primary rounded-circle me-3"
                  >
                    <i class="bi bi-file-earmark-plus"></i>
                  </div>
                  <div class="flex-grow-1">
                    <div
                      class="d-flex justify-content-between align-items-center"
                    >
                      <h6 class="mb-1">New post published</h6>
                      <small class="text-muted">10 min ago</small>
                    </div>
                    <p class="mb-0 text-muted">
                      You published "Laudium Community Center Renovation
                      Complete"
                    </p>
                  </div>
                </div>
              </div>

              <div class="list-group-item py-3">
                <div class="d-flex align-items-center">
                  <div
                    class="activity-icon bg-success bg-opacity-10 text-success rounded-circle me-3"
                  >
                    <i class="bi bi-person-plus"></i>
                  </div>
                  <div class="flex-grow-1">
                    <div
                      class="d-flex justify-content-between align-items-center"
                    >
                      <h6 class="mb-1">New user registered</h6>
                      <small class="text-muted">2 hours ago</small>
                    </div>
                    <p class="mb-0 text-muted">
                      Fatima Ahmed created a new account
                    </p>
                  </div>
                </div>
              </div>

              <div class="list-group-item py-3">
                <div class="d-flex align-items-center">
                  <div
                    class="activity-icon bg-warning bg-opacity-10 text-warning rounded-circle me-3"
                  >
                    <i class="bi bi-shop-window"></i>
                  </div>
                  <div class="flex-grow-1">
                    <div
                      class="d-flex justify-content-between align-items-center"
                    >
                      <h6 class="mb-1">New business added</h6>
                      <small class="text-muted">5 hours ago</small>
                    </div>
                    <p class="mb-0 text-muted">
                      Zainab's Bakery listing was approved
                    </p>
                  </div>
                </div>
              </div>

              <div class="list-group-item py-3">
                <div class="d-flex align-items-center">
                  <div
                    class="activity-icon bg-danger bg-opacity-10 text-danger rounded-circle me-3"
                  >
                    <i class="bi bi-chat-left-text"></i>
                  </div>
                  <div class="flex-grow-1">
                    <div
                      class="d-flex justify-content-between align-items-center"
                    >
                      <h6 class="mb-1">New comment</h6>
                      <small class="text-muted">Yesterday</small>
                    </div>
                    <p class="mb-0 text-muted">
                      New comment on "Local Business Owner Wins Entrepreneurship
                      Award"
                    </p>
                  </div>
                </div>
              </div>

              <div class="list-group-item py-3">
                <div class="d-flex align-items-center">
                  <div
                    class="activity-icon bg-info bg-opacity-10 text-info rounded-circle me-3"
                  >
                    <i class="bi bi-calendar-plus"></i>
                  </div>
                  <div class="flex-grow-1">
                    <div
                      class="d-flex justify-content-between align-items-center"
                    >
                      <h6 class="mb-1">New event created</h6>
                      <small class="text-muted">Yesterday</small>
                    </div>
                    <p class="mb-0 text-muted">
                      You created the event "Health and Wellness Fair"
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="card-footer bg-white text-center">
            <a href="#" class="text-decoration-none">View all activity</a>
          </div>
        </div>
      </div>

      <!-- Quick drafts and notifications -->
      <div class="col-lg-4">
        <!-- Quick draft -->
        <div class="card border-0 shadow-sm mb-4">
          <div class="card-header bg-white">
            <h5 class="card-title mb-0">Quick Draft</h5>
          </div>
          <div class="card-body">
            <form>
              <div class="mb-3">
                <input
                  type="text"
                  class="form-control"
                  placeholder="Title"
                  required
                />
              </div>
              <div class="mb-3">
                <textarea
                  class="form-control"
                  rows="3"
                  placeholder="Write something..."
                  required
                ></textarea>
              </div>
              <div class="d-grid">
                <button type="submit" class="btn btn-primary">
                  Save Draft
                </button>
              </div>
            </form>
          </div>
        </div>

        <!-- Pending tasks -->
        <div class="card border-0 shadow-sm">
          <div class="card-header bg-white">
            <h5 class="card-title mb-0">Pending Tasks</h5>
          </div>
          <div class="card-body p-0">
            <ul class="list-group list-group-flush">
              <li class="list-group-item d-flex align-items-center py-3">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="task1" />
                  <label class="form-check-label" for="task1"
                    >Review new business listings (3)</label
                  >
                </div>
                <span class="badge bg-warning ms-auto">Important</span>
              </li>
              <li class="list-group-item d-flex align-items-center py-3">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="task2" />
                  <label class="form-check-label" for="task2"
                    >Moderate pending comments (7)</label
                  >
                </div>
              </li>
              <li class="list-group-item d-flex align-items-center py-3">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="task3" />
                  <label class="form-check-label" for="task3"
                    >Update featured stories</label
                  >
                </div>
                <span class="badge bg-info ms-auto">This week</span>
              </li>
              <li class="list-group-item d-flex align-items-center py-3">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="task4" />
                  <label class="form-check-label" for="task4"
                    >Schedule social media posts</label
                  >
                </div>
              </li>
              <li class="list-group-item d-flex align-items-center py-3">
                <div class="form-check">
                  <input class="form-check-input" type="checkbox" id="task5" />
                  <label class="form-check-label" for="task5"
                    >Backup database</label
                  >
                </div>
                <span class="badge bg-danger ms-auto">Urgent</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
/**
 * Dashboard.vue
 * 
 * Admin dashboard overview page for the Laudium Biz application.
 * 
 * This component:
 * - Provides a high-level overview of system activity and metrics
 * - Displays statistics on content, users, and businesses
 * - Shows recent activity from across the application
 * - Offers quick access to common administrative tasks
 * - Presents a list of pending tasks requiring attention
 */
export default {
  name: "AdminDashboard",
};
</script>

<!-- 
  Scoped styles that only apply to this component
  These styles define the icon containers used throughout the dashboard
-->
<style scoped>
.icon-box {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.activity-icon {
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
</style>
