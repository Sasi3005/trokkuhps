import { useContext } from "react";
import { CustomerAuthContext } from "./customerAuthContext";

export const useCustomerAuth = () => useContext(CustomerAuthContext);