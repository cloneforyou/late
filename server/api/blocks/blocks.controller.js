const Block = require('./blocks.model');
const Assignment = require('../assignments/assignments.model');
const Exam = require('../exams/exams.model');

const logger = require('../../modules/logger');
const google = require('../../modules/google');

/**
 * Add a work block to a specific assignment and have the updated
 * assignment returned. The request body should contain the following:
 * - startTime
 * - endTime
 *
 * @param {Koa context} ctx
 * @returns The updated assignment with the new block added
 *
 * POST /
 */
async function addWorkBlock (ctx) {
  const { assessmentType, assessmentID } = ctx.params;
  const { startTime, endTime } = ctx.request.body;

  const newBlock = new Block({
    _student: ctx.state.user._id,
    startTime,
    endTime,
    completed: false,
    locked: false,
    notified: false
  });

  try {
    await newBlock.save();
  } catch (e) {
    logger.error(`Failed to save new block for ${ctx.state.user.rcs_id}: ${e}`);
    return ctx.badRequest('There was an error scheduling the work block.');
  }

  let assessment;
  // Get assessment
  try {
    assessment = await (assessmentType === 'assignment' ? Assignment : Exam)
      .findOne({
        $or: [
          { _student: ctx.state.user._id },
          { shared: true, sharedWith: ctx.state.user.rcs_id }
        ],
        _id: assessmentID
      })
      .populate('_student', '_id rcs_id name grad_year')
      .populate('_blocks');
  } catch (e) {
    logger.error(
      `Failed to get ${assessmentType} to add new work block for ${
        ctx.state.user.rcs_id
      }: ${e}`
    );
    return ctx.internalServerError(
      `There was an error getting the ${assessmentType}.`
    );
  }

  assessment._blocks.push(newBlock);

  try {
    await assessment.save();
  } catch (e) {
    logger.error(
      `Failed to save ${assessmentType} with new work block for ${
        ctx.state.user.rcs_id
      }: ${e}`
    );
    return ctx.badRequest('There was an error scheduling the work block.');
  }

  logger.info(`Adding work block for ${ctx.state.user.rcs_id}`);

  if (ctx.state.user.integrations.google.calendarIDs.workBlocks) {
    try {
      await google.actions.createEventFromWorkBlock(
        ctx,
        assessment,
        assessmentType,
        newBlock
      );
    } catch (e) {
      logger.error(
        `Failed to add GCal event for work block for ${
          ctx.state.user.rcs_id
        }: ${e}`
      );
    }
  }

  return ctx.ok({
    createdBlock: newBlock,
    updatedAssessment: assessment
  });
}

/**
 * Edit a work block by changing the start and end times.
 * The request body should contain:
 * - startTime
 * - endTime
 * - assessmentTyoe
 *
 * @param {Koa context} ctx
 * @returns Updated assessment
 *
 * PATCH /:blockID
 */
async function editWorkBlock (ctx) {
  const { assessmentType, assessmentID, blockID } = ctx.params;
  const { startTime, endTime } = ctx.request.body;

  const editedBlock = await Block.findOne({
    _id: blockID
  });

  editedBlock.set({ startTime, endTime });

  try {
    await editedBlock.save();
  } catch (e) {
    logger.error(
      `Failed to edit work block for ${ctx.state.user.rcs_id}: ${e}`
    );
    return ctx.badRequest('There was an error updatng the work block.');
  }

  let assessment;
  // Get assessment
  try {
    assessment = await (assessmentType === 'assignment' ? Assignment : Exam)
      .findOne({
        $or: [
          { _student: ctx.state.user._id },
          { shared: true, sharedWith: ctx.state.user.rcs_id }
        ],
        _id: assessmentID
      })
      .populate('_student', '_id rcs_id name grad_year')

      .populate('_blocks');
  } catch (e) {
    logger.error(
      `Failed to get ${assessmentType} for work block edit for ${
        ctx.state.user.rcs_id
      }: ${e}`
    );
    return ctx.internalServerError(
      'There was an error editing the work block.'
    );
  }

  logger.info(`Edited work block for ${ctx.state.user.rcs_id}`);

  if (ctx.state.user.integrations.google.calendarIDs.workBlocks) {
    try {
      await google.actions.patchEventFromWorkBlock(ctx, blockID, {
        start: {
          dateTime: startTime
        },
        end: {
          dateTime: endTime
        }
      });
    } catch (e) {
      logger.error(
        `Failed to patch GCal event for work block for ${
          ctx.state.user.rcs_id
        }: ${e}`
      );
    }
  }

  return ctx.ok({
    updatedAssessment: assessment
  });
}

/**
 * Delete a work block given its ID
 * @param {Koa context} ctx
 * @returns Deleted block
 *
 * DELETE /:blockID
 */
async function deleteWorkBlock (ctx) {
  const { assessmentType, assessmentID, blockID } = ctx.params;

  const removedBlock = await Block.findOne({
    _id: blockID
  });
  removedBlock.remove();

  let assessment;
  // Get assessment
  try {
    assessment = await (assessmentType === 'assignment' ? Assignment : Exam)
      .findOne({
        $or: [
          { _student: ctx.state.user._id },
          { shared: true, sharedWith: ctx.state.user.rcs_id }
        ],
        _id: assessmentID
      })
      .populate('_student', '_id rcs_id name grad_year')
      .populate('_blocks');
    assessment._blocks = assessment._blocks.filter(
      b => b._id !== removedBlock._id
    );

    await assessment.save();
  } catch (e) {
    logger.error(
      `Failed to get ${assessmentType} for work block remove for ${
        ctx.state.user.rcs_id
      }: ${e}`
    );
    return ctx.internalServerError(
      'There was an error removing the work block.'
    );
  }

  logger.info(`Deleted work block for ${ctx.state.user.rcs_id}`);

  if (ctx.state.user.integrations.google.calendarIDs.workBlocks) {
    try {
      await google.actions.deleteEventFromWorkBlock(ctx, blockID);
    } catch (e) {
      logger.error(
        `Failed to delete GCal event for work block for ${
          ctx.state.user.rcs_id
        }: ${e}`
      );
    }
  }

  return ctx.ok({
    removeBlock: removedBlock,
    updatedAssessment: assessment
  });
}

module.exports = {
  addWorkBlock,
  editWorkBlock,
  deleteWorkBlock
};
