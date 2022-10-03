import { Spinner } from "@canonical/react-components";
import { useDispatch, useSelector } from "react-redux";

import CloneForm from "./CloneForm";
import CommissionForm from "./CommissionForm";
import DeployForm from "./DeployForm";
import MarkBrokenForm from "./MarkBrokenForm";
import OverrideTestForm from "./OverrideTestForm";
import ReleaseForm from "./ReleaseForm";
import SetPoolForm from "./SetPoolForm";
import TagForm from "./TagForm";

import DeleteForm from "app/base/components/node/DeleteForm";
import FieldlessForm from "app/base/components/node/FieldlessForm";
import NodeActionFormWrapper from "app/base/components/node/NodeActionFormWrapper";
import SetZoneForm from "app/base/components/node/SetZoneForm";
import TestForm from "app/base/components/node/TestForm";
import type { HardwareType } from "app/base/enum";
import type { ClearHeaderContent, SetSearchFilter } from "app/base/types";
import urls from "app/base/urls";
import type { MachineActionFormProps } from "app/machines/types";
import { actions as machineActions } from "app/store/machine";
import machineSelectors, { statusSelectors } from "app/store/machine/selectors";
import { ACTIONS } from "app/store/machine/slice";
import type {
  Machine,
  MachineActions,
  MachineEventErrors,
} from "app/store/machine/types";
import { useDispatchWithCallId } from "app/store/machine/utils/hooks";
import type { RootState } from "app/store/root/types";
import { NodeActions } from "app/store/types/node";
import { kebabToCamelCase } from "app/utils";

type Props = {
  action: MachineActions;
  applyConfiguredNetworking?: boolean;
  clearHeaderContent: ClearHeaderContent;
  hardwareType?: HardwareType;
  selectedCountLoading?: boolean;
  setSearchFilter?: SetSearchFilter;
  viewingDetails: boolean;
} & Omit<MachineActionFormProps, "processingCount">;

const isTagUpdateAction = (action: MachineActions) =>
  [NodeActions.TAG, NodeActions.UNTAG].includes(action);

const getProcessingCount = (
  selectedMachineIds: string[] | [],
  processingMachines: Machine[],
  action: MachineActions
) => {
  if (action === NodeActions.CLONE) {
    // Cloning in the UI works inverse to the rest of the machine actions - we
    // select the destination machines first, then select the machine to perform
    // the clone action, so we don't care what the selected machines are here.
    return processingMachines.length;
  }
  return processingMachines.reduce<number>((count, processingMachine) => {
    const machineInSelection = selectedMachineIds.some(
      (system_id) => system_id === processingMachine.system_id
    );
    return machineInSelection ? count + 1 : count;
  }, 0);
};

const getProcessingSelector = (action: MachineActions) => {
  if (isTagUpdateAction(action)) {
    return machineSelectors.updatingTags;
  }
  const actionStatus = ACTIONS.find(({ name }) => name === action)?.status;
  return actionStatus ? statusSelectors[actionStatus] : () => [];
};

export const MachineActionFormWrapper = ({
  action,
  applyConfiguredNetworking,
  clearHeaderContent,
  hardwareType,
  machines,
  selectedCount,
  selectedCountLoading,
  selectedFilter,
  setSearchFilter,
  viewingDetails,
}: Props): JSX.Element => {
  const dispatch = useDispatch();

  const processingMachines = useSelector(getProcessingSelector(action));
  // When updating tags we want to surface both "tag" and "untag" errors.
  const errorEvents = isTagUpdateAction(action)
    ? [NodeActions.TAG, NodeActions.UNTAG]
    : [kebabToCamelCase(action)];
  // The form expects one error, so we only show the latest error with the
  // assumption that all selected machines fail in the same way.
  const errors = useSelector((state: RootState) =>
    machineSelectors.eventErrorsForIds(
      state,
      machines?.map(({ system_id }) => system_id) || [],
      errorEvents
    )
  )[0]?.error;
  const processingCount = getProcessingCount(
    machines?.map((machine) => machine.system_id) || [],
    processingMachines,
    action
  );
  const { callId: dispatchCallId, dispatch: dispatchWithCallId } =
    useDispatchWithCallId();
  const actionState = useSelector((state: RootState) =>
    machineSelectors.getActionState(state, dispatchCallId)
  );

  const commonMachineFormProps = {
    clearHeaderContent,
    viewingDetails,
    ...(machines
      ? { machines, processingCount, errors }
      : {
          selectedFilter,
          actionStatus: actionState?.status,
          errors: actionState?.errors,
          selectedCount,
          selectedCountLoading,
        }),
  };
  const commonNodeFormProps = {
    cleanup: machineActions.cleanup,
    clearHeaderContent,
    errors,
    modelName: "machine",
    viewingDetails,
    ...(machines
      ? { nodes: machines, processingCount }
      : {
          selectedFilter,
          actionStatus: actionState?.status,
          errors: actionState?.errors,
          selectedCount,
          selectedCountLoading,
        }),
  };

  const getFormComponent = () => {
    switch (action) {
      case NodeActions.CLONE:
        return (
          <CloneForm
            setSearchFilter={setSearchFilter}
            {...commonMachineFormProps}
          />
        );
      case NodeActions.COMMISSION:
        return <CommissionForm {...commonMachineFormProps} />;
      case NodeActions.DELETE:
        return (
          <DeleteForm
            onSubmit={() => {
              if (selectedFilter) {
                dispatchWithCallId(
                  machineActions.delete({ filter: selectedFilter })
                );
              } else {
                machines?.forEach((machine) => {
                  dispatch(
                    machineActions.delete({
                      system_id: machine.system_id,
                    })
                  );
                });
              }
            }}
            redirectURL={urls.machines.index}
            {...commonNodeFormProps}
          />
        );
      case NodeActions.DEPLOY:
        return <DeployForm {...commonMachineFormProps} />;
      case NodeActions.MARK_BROKEN:
        return <MarkBrokenForm {...commonMachineFormProps} />;
      case NodeActions.OVERRIDE_FAILED_TESTING:
        return <OverrideTestForm {...commonMachineFormProps} />;
      case NodeActions.RELEASE:
        return <ReleaseForm {...commonMachineFormProps} />;
      case NodeActions.SET_POOL:
        return <SetPoolForm {...commonMachineFormProps} />;
      case NodeActions.SET_ZONE:
        return (
          <SetZoneForm<MachineEventErrors>
            onSubmit={(zoneID) => {
              dispatch(machineActions.cleanup());
              if (selectedFilter) {
                dispatchWithCallId(
                  machineActions.setZone({
                    filter: selectedFilter,
                    zone_id: zoneID,
                  })
                );
              } else {
                machines?.forEach((machine) => {
                  dispatch(
                    machineActions.setZone({
                      system_id: machine.system_id,
                      zone_id: zoneID,
                    })
                  );
                });
              }
            }}
            {...commonNodeFormProps}
          />
        );
      case NodeActions.TAG:
      case NodeActions.UNTAG:
        return <TagForm {...commonMachineFormProps} />;
      case NodeActions.TEST:
        return (
          <TestForm<MachineEventErrors>
            applyConfiguredNetworking={applyConfiguredNetworking}
            hardwareType={hardwareType}
            onTest={(args) => {
              dispatchWithCallId(
                machineActions.test({
                  enable_ssh: args.enableSSH,
                  script_input: args.scriptInputs,
                  ...(args.filter
                    ? { filter: args.filter }
                    : { system_id: args.systemId }),
                  testing_scripts: args.scripts.map((script) => script.name),
                })
              );
            }}
            {...commonNodeFormProps}
          />
        );
      case NodeActions.ABORT:
      case NodeActions.ACQUIRE:
      case NodeActions.EXIT_RESCUE_MODE:
      case NodeActions.LOCK:
      case NodeActions.MARK_FIXED:
      case NodeActions.OFF:
      case NodeActions.ON:
      case NodeActions.RESCUE_MODE:
      case NodeActions.UNLOCK:
        return (
          <FieldlessForm
            action={action}
            actions={machineActions}
            {...commonNodeFormProps}
          />
        );
    }
  };

  if (selectedCountLoading) {
    return <Spinner />;
  }

  return machines ? (
    <NodeActionFormWrapper
      action={action}
      nodeType="machine"
      nodes={machines || []}
      onUpdateSelected={(machineIDs) =>
        dispatch(machineActions.setSelectedMachines({ items: machineIDs }))
      }
      processingCount={processingCount}
      viewingDetails={viewingDetails}
    >
      {getFormComponent()}
    </NodeActionFormWrapper>
  ) : (
    getFormComponent()
  );
};

export default MachineActionFormWrapper;
