<template>
  <section class="policy-page container py-5">
    <header class="mb-4">
      <h1 class="display-5 mb-2">About Laudium Post</h1>
      <p class="text-muted mb-0">Ownership, contact details, and editorial responsibilities</p>
    </header>

    <div class="content">
      <p>
        Laudium Post Community News is a local news and information service focused on the Laudium, South Africa
        community. We publish original and aggregated community updates, announcements, and reporting in line with our
        editorial policy.
      </p>

      <h2 class="h4 mt-4">Ownership</h2>
      <p>
        Laudium Post is operated by SAFAI Pty LTD. We are an independent publisher with an emphasis on community
        relevance and accuracy.
      </p>

      <h2 class="h4 mt-4">Publisher and Editorial Contact</h2>
      <ul class="list-unstyled">
        <li>
          <strong>Publisher:</strong> SAFAI Pty LTD
        </li>
        <li>
          <strong>Email:</strong>
          <a href="mailto:info@lauduimbiz.co.za">info@lauduimbiz.co.za</a>
        </li>
        <li>
          <strong>Location:</strong> Laudium, Pretoria, Gauteng, South Africa
        </li>
      </ul>

      <h2 class="h4 mt-4">Corrections and Feedback</h2>
      <p>
        If you spot an error in our reporting, please see our
        <router-link to="/corrections">Corrections Policy</router-link> for how to request a correction.
      </p>

      <h2 class="h4 mt-4">Privacy</h2>
      <p>
        We take your privacy seriously. Read our <router-link to="/privacy-policy">Privacy Policy</router-link> for
        details about data we collect and how it is used.
      </p>

      <h2 class="h4 mt-4">AI-Generated Content Disclosure</h2>
      <p>
        Some articles published on Laudium Post may be generated with the assistance of artificial intelligence (AI) tools
        including ChatGPT and Google Gemini. While AI helps us create initial drafts and summaries, all
        content is reviewed by our editorial team for accuracy, context, and relevance to our community. Articles that are
        AI-assisted will include proper attribution and links to sources where applicable.
      </p>
      <p>
        We are committed to transparency in our content creation process and will clearly label AI-assisted content. If
        you have questions about how we use AI in our editorial process, please contact us at
        <a href="mailto:info@lauduimbiz.co.za">info@lauduimbiz.co.za</a>.
      </p>
    </div>
  </section>
</template>

<script>
export default {
  name: "AboutPublisherPage",
};
</script>

<style scoped>
.policy-page {
  max-width: 900px;
}
</style>
