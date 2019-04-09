<template>
  <div class="assessments-upcoming">
    <p
      v-if="none"
      class="has-text-centered has-text-grey"
    >
      No upcoming assessments
      <i
        v-if="filter.length > 0 || !showCompleted"
        style="font-style:inherit"
      >matching your filters.</i>
      <i
        v-else-if="filter.length <= 0"
        style="font-style:inherit"
      >for the next 2 weeks!</i>
    </p>
    <div
      v-else
      class="columns is-multiline"
    >
      <div
        v-for="(assessments, key) in groupedFilteredLimitedAssessments"
        :key="key"
        class="column is-one-third-desktop is-half-tablet"
      >
        <div class="panel">
          <p
            class="panel-heading is-unselectable key-heading"
            :class="{ 'has-background-dark has-text-white' : groupBy === 'date' }"
            :style="headerStyle(key)"
          >
            <span
              class="key"
              :title="headerTitle(key)"
              @click="headerClick(key)"
            >{{ headerText(key) }}</span>
            <!-- <span class="tag is-danger is-pulled-right day-weight-tag">Light</span> -->
            <span class="is-pulled-right add-assessment-buttons">
              <i
                class="has-text-white fas fa-clipboard-check"
                :title="addAssessmentTitle(key, 'assignment')"
                @click="addAssessmentClick(key, 'assignment')"
              />
              <i
                class="has-text-white fas fa-file-alt"
                :title="addAssessmentTitle(key, 'exam')"
                @click="addAssessmentClick(key, 'exam')"
              />
            </span>
          </p>
          <AssessmentPanelBlock
            v-for="a in assessments"
            :key="a._id"
            :group-by="groupBy"
            :assessment="a"
            @toggle-assignment="$emit('toggle-assignment', arguments[0])"
          />
        </div>
      </div>
    </div>
    <div
      v-if="filteredFarFutureAssessments.length > 0"
      class="far-future-assignments"
    >
      <hr>
      <p class="has-text-centered has-text-grey">
        {{ filteredFarFutureAssessments.length }} far future items {{ showingFutureAssessments ? 'shown' : 'hidden' }}
        <a
          @click="showingFutureAssessments = !showingFutureAssessments"
        >Toggle</a>
      </p>

      <AssessmentsTable
        v-if="showingFutureAssessments"
        :assessments="filteredFarFutureAssessments"
      />
    </div>
  </div>
</template>

<script>
import moment from 'moment';

import AssessmentPanelBlock from '@/views/components/assessments/upcoming/AssessmentPanelBlock';
import AssessmentsTable from '@/views/components/assessments/AssessmentsTable.vue';

export default {
  name: 'AssessmentsUpcoming',
  components: { AssessmentsTable, AssessmentPanelBlock },
  props: {
    showCompleted: {
      type: Boolean,
      default: true
    },
    groupBy: {
      type: String,
      required: true
    },
    filter: {
      type: Array,
      default: () => []
    }
  },
  data () {
    return {
      showingFutureAssessments: false
    };
  },
  computed: {
    now () {
      return this.$store.state.now;
    },
    none () {
      return Object.keys(this.filteredLimitedAssessments).length === 0;
    },
    filteredLimitedAssessments () {
      return this.$store.getters.limitedUpcomingAssessments.filter(
        assessment => {
          if (assessment.assessmentType === 'assignment') {
            if (!this.showCompleted && assessment.completed) return false;
          }
          return !this.filter.includes(assessment.courseCRN);
        }
      );
    },
    groupedFilteredLimitedAssessments () {
      return this.$store.getters.groupAssessments(
        this.groupBy,
        this.filteredLimitedAssessments
      );
    },
    farFutureUpcomingAssessments () {
      return this.$store.getters.farFutureUpcomingAssessments;
    },
    filteredFarFutureAssessments () {
      return this.farFutureUpcomingAssessments.filter(assessment => {
        if (assessment.assessmentType === 'assignment') {
          if (!this.showCompleted && assessment.completed) return false;
        }
        return !this.filter.includes(assessment.courseCRN);
      });
    }
  },
  methods: {
    course (crn) {
      return this.$store.getters.getCourseFromCRN(crn);
    },
    headerTitle (key) {
      return this.groupBy === 'courseCRN'
        ? 'Open course modal'
        : moment(key).format('M/DD/YY');
    },
    headerText (key) {
      return this.groupBy === 'courseCRN'
        ? this.course(key).longname
        : this.toDateShortString(key);
    },
    headerStyle (key) {
      if (this.groupBy === 'date') return {};
      let color = this.course(key).color;
      if (color.length < 5) {
        color += color.slice(1);
      }
      return {
        'background-color':
          this.groupBy === 'courseCRN' ? this.course(key).color : 'inherit',
        color: color.replace('#', '0x') > 0xffffff / 1.2 ? '#333' : '#fff'
      };
    },
    headerClick (key) {
      if (this.groupBy === 'courseCRN') {
        this.$store.commit('OPEN_COURSE_MODAL', this.course(key));
      } else {
        // TODO: this will open DayModal
        // this.$store.commit('SET_ADD_ASSIGNMENT_MODAL_VALUES', {
        //   dueDate: moment(key)
        // });
        // this.$store.commit('TOGGLE_ADD_ASSIGNMENT_MODAL');
      }
    },
    addAssessmentClick (key, assessmentType) {
      let updates = {};
      if (this.groupBy === 'courseCRN') {
        updates.courseCRN = key;
        updates.modalStep = 1;
      } else {
        updates[assessmentType === 'assignment' ? 'dueDate' : 'date'] = moment(
          key
        );
        updates.modalStep = 0;
      }
      this.$store.commit(
        'SET_ADD_' + assessmentType.toUpperCase() + '_MODAL_VALUES',
        updates
      );
      this.$store.commit(
        'TOGGLE_ADD_' + assessmentType.toUpperCase() + '_MODAL'
      );
    },
    addAssessmentTitle (key, assessmentType) {
      if (this.groupBy === 'courseCRN') {
        return `Add new ${this.course(key).longname} ${assessmentType}`;
      } else {
        return `Add new ${assessmentType} on ${moment(key).format('M/DD/YY')}`;
      }
    },
    toggleAssignmentTitle (a) {
      return (
        this.course(a.courseCRN).longname +
        (a.completedAt
          ? ` | Completed ${moment(a.completedAt).format('M/DD/YY h:mma')}`
          : '')
      );
    },
    toDateShortString (dueDate) {
      if (moment(dueDate).isSame(moment(), 'day')) return 'Today';
      if (moment(dueDate).isSame(moment().add(1, 'day'), 'day')) {
        return 'Tomorrow';
      }
      return moment(dueDate).format('dddd [the] Do');
    },
    toTimeString (dueDate) {
      return moment(dueDate).format('h:mma');
    },
    fromNow (date) {
      return moment(date).fromNow();
    },
    daysAway (date) {
      return moment(date).diff(moment(this.now).startOf('day'), 'days');
    }
  }
};
</script>

<style lang="scss" scoped>
.key-heading {
  span.key {
    cursor: pointer;
  }

  .add-assessment-buttons {
    transition: opacity 0.1s;
    @media only screen and (min-width: 768px) {
      opacity: 0;
    }
    i {
      cursor: pointer;
      padding-left: 10px;
    }
  }

  &:hover {
    .add-assessment-buttons {
      opacity: 1;
    }
  }
}

.dot {
  margin-right: 5px;
}
</style>