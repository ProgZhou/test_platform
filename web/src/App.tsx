import React, { lazy, Suspense } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { Spin } from "antd";
import AppLayout from "./components/Layout/AppLayout";

const CaseList = lazy(() => import("./pages/CaseList"));
const ApiList = lazy(() => import("./pages/Apis/ApiList"));
const ApiDebug = lazy(() => import("./pages/Apis/ApiDebug"));
const ScriptList = lazy(() => import("./pages/Scripts/ScriptList"));
const ScriptEditor = lazy(() => import("./pages/Scripts/ScriptEditor"));
const ExecutionCreate = lazy(() => import("./pages/ExecutionCreate"));
const ExecutionDetail = lazy(() => import("./pages/ExecutionDetail"));
const ReportList = lazy(() => import("./pages/ReportList"));
const ReportDetail = lazy(() => import("./pages/ReportDetail"));

const LoadingFallback = () => (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      height: "100vh",
    }}
  >
    <Spin size="large" />
  </div>
);

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Navigate to="/cases" replace />} />
          <Route
            path="cases"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <CaseList />
              </Suspense>
            }
          />
          <Route
            path="apis"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <ApiList />
              </Suspense>
            }
          />
          <Route
            path="apis/:id/debug"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <ApiDebug />
              </Suspense>
            }
          />
          <Route
            path="scripts"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <ScriptList />
              </Suspense>
            }
          />
          <Route
            path="scripts/:id/edit"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <ScriptEditor />
              </Suspense>
            }
          />
          <Route
            path="execution"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <ExecutionCreate />
              </Suspense>
            }
          />
          <Route
            path="execution/:id"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <ExecutionDetail />
              </Suspense>
            }
          />
          <Route
            path="reports"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <ReportList />
              </Suspense>
            }
          />
          <Route
            path="reports/:id"
            element={
              <Suspense fallback={<LoadingFallback />}>
                <ReportDetail />
              </Suspense>
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
