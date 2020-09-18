import React, { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams } from "react-router";

import { actions as podActions } from "app/store/pod";
import podSelectors from "app/store/pod/selectors";
import ActionForm from "app/base/components/ActionForm";

type Props = {
  setSelectedAction: (action: string | null) => void;
};

type RouteParams = {
  id: string;
};

const DeleteForm = ({ setSelectedAction }: Props): JSX.Element => {
  const dispatch = useDispatch();
  const { id } = useParams<RouteParams>();
  const errors = useSelector(podSelectors.errors);
  const selectedKVMIDs = useSelector(podSelectors.selectedKVMs).map(
    (kvm) => kvm.id
  );
  const deletingSelected = useSelector(podSelectors.deletingSelected);
  const kvmsToDelete = id ? [Number(id)] : selectedKVMIDs;
  const cleanup = useCallback(() => podActions.cleanup(), []);

  return (
    <ActionForm
      actionName="delete"
      cleanup={cleanup}
      clearSelectedAction={() => setSelectedAction(null)}
      errors={errors}
      modelName="KVM"
      onSubmit={() => {
        kvmsToDelete.forEach((kvmID) => {
          dispatch(podActions.delete(kvmID));
        });
      }}
      processingCount={deletingSelected.length}
      selectedCount={kvmsToDelete.length}
      submitAppearance="negative"
    />
  );
};

export default DeleteForm;
