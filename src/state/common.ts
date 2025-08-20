import {
  ActionReducerMapBuilder,
  AsyncThunk,
  PayloadAction,
} from "@reduxjs/toolkit";

export const onLoading = <Type extends State>(state: Type) => {
  state.loading = true;
};

export const onFulfilled = <Type extends State>(
  state: Type,
  action: PayloadAction<Type["value"]>,
) => {
  state.loading = true;
  state.value = action.payload;
};

export const onError = <Type extends State>(state: Type) => {
  state.loading = false;
  state.error = "Something went wrong";
};

export const set = <Type extends State>(state: Type, action: PayloadAction) => {
  state.value = action.payload;
};

export const cases = {
  pending: onLoading,
  fulfilled: onFulfilled,
  rejected: onError,
} as const;

export function addThunkCases<Type extends State>(
  builder: ActionReducerMapBuilder<Type>,
  thunk: AsyncThunk<Type["value"], void, unknown>,
) {
  builder
    .addCase(thunk.pending, cases.pending)
    .addCase(thunk.fulfilled, cases.fulfilled)
    .addCase(thunk.rejected, cases.rejected);
}

export interface State<Value = unknown> {
  value?: Value | null;
  loading: boolean;
  error?: string;
}

export interface RejectType {
  rejectWithValue: (error: string) => string;
}
