import {
  ActionReducerMapBuilder,
  AsyncThunk,
  PayloadAction,
} from "@reduxjs/toolkit";

export const onLoading = <Type extends AsyncState>(state: Type) => {
  state.loading = true;
};

export const onFulfilled = <Type extends AsyncState>(
  state: Type,
  action: PayloadAction<Type["value"]>,
) => {
  state.loading = false;
  state.value = action.payload;
};

export const onError = <Type extends AsyncState>(state: Type) => {
  state.loading = false;
  state.error = "Something went wrong";
};

export const set = <Type extends State>(
  state: Type,
  action: PayloadAction<Type["value"]>,
) => {
  state.value = action.payload;
};

export const cases = {
  pending: onLoading,
  fulfilled: onFulfilled,
  rejected: onError,
} as const;

export function addThunkCases<State extends AsyncState, ThunkParameter>(
  builder: ActionReducerMapBuilder<State>,
  thunk: AsyncThunk<State["value"], ThunkParameter, unknown>,
) {
  builder
    .addCase(thunk.pending, cases.pending)
    .addCase(thunk.fulfilled, cases.fulfilled)
    .addCase(thunk.rejected, cases.rejected);
}

export interface AsyncState<Value = unknown> {
  value?: Value | null;
  loading: boolean;
  error?: string;
}

export interface State<Value = unknown> {
  value?: Value;
}

export interface RejectType {
  rejectWithValue: (error: string) => string;
}
