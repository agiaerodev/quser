<template>
  <socialBtn
    v-if="clientIdGoogle"
    :loading="loading"
    @click.native="signIn()"
    :title="`${$tr('isite.cms.label.continueWith')} ${$tr('isite.cms.label.google')}`"
    :icon="require('modules/quser/_components/socialAuth/icons/google.svg')"
  />
</template>

<script>
import socialBtn from 'modules/quser/_components/socialAuth/socialBtn.vue';

export default {
  props: {
    buttonProps: {
      default: () => {
        return {}
      }
    },

    clientId: {
      required: false,
      default: ''
    }
  },

  emits: ['logged', 'logging', 'error'],

  components: {
    socialBtn
  },

  data() {
    return {
      success: true,
      loading: false,

      // Indicates that Google returned a credential.
      googleLoginCompleted: false,

      // Prevents multiple fallback attempts.
      fallbackExecuted: false,

      // Stores the timeout used to detect a failed prompt.
      googlePromptTimeout: null
    }
  },

  computed: {
    clientIdGoogle() {
      return this?.clientId
        ? this.clientId
        : this.$getSetting('isite::googleClientId')
    },

    propsButton() {
      return {
        color: 'red',
        icon: 'fab fa-google',
        loading: this.loading,
        vIf: this.success,
        ...this.buttonProps
      }
    }
  },

  mounted() {
    this.$nextTick(() => {
      this.addCDN()
    })
  },

  beforeDestroy() {
    this.clearGooglePromptTimeout()
  },

  methods: {
    // Add Google Identity Services CDN to head.
    addCDN() {
      const cdn = document.createElement('script')

      cdn.setAttribute(
        'src',
        'https://accounts.google.com/gsi/client'
      )

      cdn.onload = () => {
        this.loadClientId()
      }

      document.head.appendChild(cdn)
    },

    // Initialize Google Identity Services.
    loadClientId() {
      setTimeout(() => {
        const clientId = this.clientIdGoogle || null

        if (!clientId) {
          return
        }

        google.accounts.id.initialize({
          client_id: clientId,
          callback: this.login,
          scope: 'profile email openid',
          cancel_on_tap_outside: false,
          context: 'use',

          // Keep the normal button flow independent
          // from FedCM.
          use_fedcm_for_button: false
        })
      }, 500)
    },

    // Start Google authentication.
    signIn() {
      try {
        this.$emit('logging')

        this.loading = true
        this.googleLoginCompleted = false
        this.fallbackExecuted = false

        this.clearGooglePromptTimeout()

        google.accounts.id.prompt((notification) => {
          console.log('Google prompt notification:', notification)

          /*
           * These notifications can still be useful when
           * Google provides them, but they should NOT be
           * considered a direct FedCM error.
           */
          if (
            notification?.isNotDisplayed?.() ||
            notification?.isSkippedMoment?.() ||
            notification?.isDismissedMoment?.()
          ) {
            console.warn(
              'Google One Tap was not completed.'
            )

            this.executeFallback()
          }
        })

        /*
         * Important:
         *
         * FedCM errors such as:
         *
         * "FedCM was disabled..."
         *
         * are not exposed as a JavaScript exception by
         * google.accounts.id.prompt().
         *
         * Therefore we use the absence of a credential
         * as the failure condition.
         */
        this.googlePromptTimeout = setTimeout(() => {
          if (!this.googleLoginCompleted) {
            console.warn(
              'Google One Tap did not return a credential.'
            )

            this.executeFallback()
          }
        }, 5000)

      } catch (error) {
        console.error(
          'Google Sign-In initialization error:',
          error
        )

        this.clearGooglePromptTimeout()
        this.executeFallback()
      }
    },

    // Execute fallback authentication.
    executeFallback() {
      if (
        this.googleLoginCompleted ||
        this.fallbackExecuted
      ) {
        return
      }

      this.fallbackExecuted = true
      this.clearGooglePromptTimeout()

      console.warn(
        'Executing Google authentication fallback.'
      )

      this.loading = false

      /*
       * IMPORTANT:
       *
       * This is where the fallback authentication
       * mechanism should be executed.
       *
       * The current google.accounts.id.prompt()
       * API does not provide a "disable FedCM and
       * retry" method.
       */
      this.$emit('error')
    },

    // Handle Google credential.
    login(response) {
      this.googleLoginCompleted = true
      this.clearGooglePromptTimeout()

      const token = response?.credential

      if (!token) {
        this.loading = false
        this.executeFallback()

        return this.$alert.error(
          this.$tr('isite.cms.message.errorRequest')
        )
      }

      this.$store.dispatch(
        'quserAuth/AUTH_SOCIAL_NETWORK',
        {
          type: 'google',
          token: token
        }
      )
        .then(() => {
          this.$emit('logged')
          this.loading = false
        })
        .catch((error) => {
          console.error(
            'Google authentication request failed:',
            error
          )

          this.$alert.error(
            this.$tr('isite.cms.message.errorRequest')
          )

          this.loading = false
        })
    },

    clearGooglePromptTimeout() {
      if (this.googlePromptTimeout) {
        clearTimeout(this.googlePromptTimeout)
        this.googlePromptTimeout = null
      }
    }
  }
}
</script>

<style lang="scss">
</style>

