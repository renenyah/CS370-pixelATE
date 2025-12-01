/**
 * this folder and the files inside is a protected route wrapper that
 * makes it so everything is locked behind authentication. meanign you won't 
 * be able to accecss the home page or the profile page unless the account has been verified
 */


import { Redirect, Slot } from "expo-router";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedLayout() {
    const { user } = useAuth;

    if (!user) return <Redirect href="/login" />;

    return <Slot />;

}