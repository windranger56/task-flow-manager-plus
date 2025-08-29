import {
  ActionReducerMapBuilder,
  AsyncThunk,
  PayloadAction,
} from "@reduxjs/toolkit";

export const onLoading = <Type extends AsyncState>(state: Type) => {
  // We set the state to "loading" only on initial set.
  // When the initial state is loaded, we refresh it without triggering the loading
  if (!state.value) state.loading = true;
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

export function addThunkCases<State extends AsyncState, ThunkParameter>(
  builder: ActionReducerMapBuilder<State>,
  thunk: AsyncThunk<State["value"], ThunkParameter, unknown>,
) {
  builder
    .addCase(thunk.pending, onLoading)
    .addCase(thunk.fulfilled, onFulfilled)
    .addCase(thunk.rejected, onError);
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
