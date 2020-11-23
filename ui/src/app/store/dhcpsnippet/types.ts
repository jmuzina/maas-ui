import type { Host } from "app/store/types/host";
import type { Model } from "app/store/types/model";
import type { GenericState } from "app/store/types/state";

import type { TSFixMe } from "app/base/types";
import type { Device } from "app/store/device/types";
import type { Subnet } from "app/store/subnet/types";

export type DHCPSnippetHistory = Model & {
  created: string;
  value: string;
};

export type DHCPSnippet = Model & {
  created: string;
  description: string;
  enabled: boolean;
  history: DHCPSnippetHistory[];
  name: string;
  node: Host | Device | null;
  subnet: Subnet["id"] | null;
  updated: string;
  value: string;
};

export type DHCPSnippetState = GenericState<DHCPSnippet, TSFixMe>;
